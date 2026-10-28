import { MutationEvent, Storage } from "kevast/dist/Storage"

interface KVMap {
    [key: string]: string | undefined
}

export const DEFAULT_FILENAME = "kevast-gist-default.json"
const GIST_DESCRIPTION = "This file is used by KevastGist."

export interface GistCandidate {
    id: string
    updatedAt: string
    domains: string[]
}

export async function listGistCandidates(token: string): Promise<GistCandidate[]> {
    const candidates: GistCandidate[] = []
    for (let page = 1; ; page++) {
        const response = await fetch(`https://api.github.com/gists?per_page=100&page=${page}`, {
            headers: {
                Authorization: `token ${token}`,
                "Cache-Control": "no-cache, no-store",
            },
        })
        if (!response.ok) {
            throw new Error(`Failed to list gists: ${response.status}`)
        }
        const gists = await response.json()
        for (const gist of gists) {
            if (gist.public !== false ||
                gist.description !== GIST_DESCRIPTION ||
                !gist.files ||
                !gist.files[DEFAULT_FILENAME]) {
                continue
            }
            const file = gist.files[DEFAULT_FILENAME]
            let content = file.content || ""
            if (!content && gist.url) {
                const detail = await fetch(gist.url, {
                    headers: {
                        Authorization: `token ${token}`,
                        "Cache-Control": "no-cache, no-store",
                    },
                })
                if (detail.ok) {
                    const data = await detail.json()
                    const detailFile = data.files && data.files[DEFAULT_FILENAME]
                    if (detailFile) {
                        content = detailFile.truncated ? "" : detailFile.content || ""
                    }
                }
            }
            if (!content && file.raw_url) {
                const raw = await fetch(file.raw_url)
                if (raw.ok) {
                    content = await raw.text()
                }
            }
            let domains: string[] = []
            try {
                const map = JSON.parse(content)
                domains = Object.keys(map).filter((key) => !key.startsWith("__") && key !== "userAgent")
            } catch (err) {
                // Ignore malformed gist content; it can still be selected.
            }
            candidates.push({
                id: gist.id,
                updatedAt: gist.updated_at,
                domains,
            })
        }
        if (gists.length < 100) {
            break
        }
    }
    candidates.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return candidates
}

export class KevastGist implements Storage {
    private gistId: string
    private filename: string
    private cache: KVMap
    private initialized: boolean
    private token: string
    private updatedAt?: string

    public constructor(token: string, gistId?: string, filename?: string) {
        if (typeof token !== "string") {
            throw TypeError("Access token must be string.")
        }
        if (gistId !== undefined && typeof gistId !== "string") {
            throw TypeError("Gist id must be string.")
        }
        if (filename !== undefined && typeof filename !== "string") {
            throw TypeError("Filename must be string.")
        }
        this.token = token
        this.cache = {}
        this.initialized = false
        this.gistId = gistId || ""
        this.filename = filename || ""
    }
    public async get(key: string): Promise<string | undefined> {
        await this.init()
        return this.cache[key]
    }
    public async mutate(event: MutationEvent) {
        await this.init()
        event.set.forEach((pair) => (this.cache[pair.key] = pair.value))
        event.removed.forEach((key) => delete this.cache[key])
        if (event.clear) {
            this.cache = {}
        }
        await this.write()
    }
    public async getGistId(): Promise<string> {
        if (!this.gistId) {
            await this.init()
        }
        return this.gistId
    }
    public async getFilename(): Promise<string> {
        if (!this.filename) {
            await this.init()
        }
        return this.filename
    }
    public getUpdatedAt(): string | undefined {
        return this.updatedAt
    }
    public async init(): Promise<void> {
        if (this.initialized) {
            return
        }
        try {
            await this.update(true)
            this.initialized = true
        } catch (err) {
            handleError(err)
        }
    }

    public async update(force: boolean = false): Promise<void> {
        if (!force && !this.initialized) {
            await this.init()
        }
        if (!this.gistId) {
            this.filename = DEFAULT_FILENAME
            this.gistId = await this.findGist() || await this.createGist()
            this.cache = await this.read()
            return
        }
        if (this.filename) {
            this.cache = await this.read()
        } else {
            this.filename = DEFAULT_FILENAME
            await this.createFile()
            this.cache = {}
        }
    }
    private async write(): Promise<void> {
        const payload = {
            files: {
                [this.filename]: {
                    content: JSON.stringify(this.cache),
                },
            },
        }
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: "PATCH",
            headers: {
                Authorization: `token ${this.token}`,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store",
            },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            throw new Error(`Failed to write gist: ${response.status}`)
        }
    }
    private async read(): Promise<KVMap> {
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            headers: {
                Authorization: `token ${this.token}`,
                "Cache-Control": "no-cache, no-store",
            },
        })
        if (!response.ok) {
            throw new Error(`Failed to read gist: ${response.status}`)
        }
        const data = await response.json()
        this.updatedAt = data.updated_at
        const file = data.files[this.filename]
        if (!file) {
            // Create a new one owns the filename
            await this.createFile()
            return {}
        } else if (file.size === 0) {
            return {}
        } else {
            let content: string
            if (file.truncated) {
                const rawResponse = await fetch(file.raw_url)
                if (!rawResponse.ok) {
                    throw new Error(`Failed to fetch raw content: ${rawResponse.status}`)
                }
                content = await rawResponse.text()
            } else {
                content = file.content
            }
            try {
                return JSON.parse(content)
            } catch (err) {
                throw new Error("Fail to parse gist content")
            }
        }
    }
    private async createFile(): Promise<void> {
        const payload = {
            files: {
                [this.filename]: {
                    content: "{}",
                },
            },
        }
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: "PATCH",
            headers: {
                Authorization: `token ${this.token}`,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store",
            },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            throw new Error(`Failed to create file: ${response.status}`)
        }
    }
    private async findGist(): Promise<string | undefined> {
        const candidates = await listGistCandidates(this.token)
        return candidates.length ? candidates[0].id : undefined
    }
    private async createGist(): Promise<string> {
        const payload = {
            description: GIST_DESCRIPTION,
            public: false,
            files: {
                [this.filename]: {
                    content: "{}",
                },
            },
        }
        const response = await fetch("https://api.github.com/gists", {
            method: "POST",
            headers: {
                Authorization: `token ${this.token}`,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store",
            },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            throw new Error(`Failed to create gist: ${response.status}`)
        }
        const data = await response.json()
        return data.id
    }
}

function handleError(error: any) {
    if (error.response) {
        const response = error.response
        if (response.status === 401) {
            throw new Error("Invalid access token")
        } else if (response.status === 404) {
            const scopes = response.headers.get("x-oauth-scopes") as string
            if (!scopes || !scopes.includes("gist")) {
                throw new Error('The OAuth scopes of access token must include "gist"')
            } else if (response.data && response.data.message === "Not Found") {
                throw new Error(
                    "Gist does not exist or No permission to operate this gist"
                )
            }
        }
    }
    throw error
}