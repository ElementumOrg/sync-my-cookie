NAME = sync-my-cookie
GIT = git
GIT_VERSION = $(shell $(GIT) describe --abbrev=0 --tags)
GIT_USER = elementumorg
GIT_REPOSITORY = sync-my-cookie
TAG_VERSION = $(subst v,,$(GIT_VERSION))
LAST_COMMIT = $(shell $(GIT) log -1 --pretty=\%B)
VERSION = $(shell sed -ne "s/.*\"version\": \"\([0-9a-z\.\-]*\)\".*/\1/p" package.json)
ZIP_SUFFIX = zip
ZIP_FILE = $(NAME)-$(VERSION).$(ZIP_SUFFIX)

all: clean zip

$(ZIP_FILE):
	export NODE_OPTIONS=--openssl-legacy-provider
	yarn
	yarn build

	cd build && zip -9 -r -g ../$(ZIP_FILE) *

zip: $(ZIP_FILE)

clean:
	rm -f $(ZIP_FILE)
	rm -rf build

upload:
	$(eval EXISTS := $(shell github-release info --user $(GIT_USER) --repo $(GIT_REPOSITORY) --tag v$(VERSION) 1>&2 2>/dev/null; echo $$?))
ifneq ($(EXISTS),1)
	github-release release \
		--user $(GIT_USER) \
		--repo $(GIT_REPOSITORY) \
		--tag v$(VERSION) \
		--name "$(VERSION)" \
		--description "$(VERSION)"
endif

	sleep 5
	github-release upload \
		--user $(GIT_USER) \
		--repo $(GIT_REPOSITORY) \
		--replace \
		--tag v$(VERSION) \
		--file $(NAME)-$(VERSION).zip \
		--name $(NAME)-$(VERSION).zip
