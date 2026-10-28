# SyncMyCookie
[English](https://github.com/ElementumOrg/sync-my-cookie/blob/master/README.md) | [中文](https://blog.andiedie.cn/posts/abbd/)

SyncMyCookie is a Chrome extension to synchronize your cookies. This is the maintained v3 fork by [ElementumOrg](https://github.com/ElementumOrg); the original project is [Andiedie/sync-my-cookie](https://github.com/Andiedie/sync-my-cookie).

You can specify to sync cookies for any website, configure rules for `Auto Merge` and `Auto Push`.

## Install

Current builds require Chrome (or another Chromium-based browser) **130 or newer** (see `minimum_chrome_version` in `manifest.json`).

### From the Chrome Web Store

[SyncMyCookie v3](https://chromewebstore.google.com/detail/syncmycookie-v3/nbjjnnaeffojibdlfkbafbjnknafefac)

### From a release build

1. Download the latest `sync-my-cookie-<version>.zip` from [Releases](https://github.com/ElementumOrg/sync-my-cookie/releases).
2. Unzip it.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder. It must contain `manifest.json` at its root.

### From source

Requirements: [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/) (npm works too). On Windows, run the commands in Git Bash or WSL, since the build scripts use Unix shell commands.

```bash
git clone https://github.com/ElementumOrg/sync-my-cookie.git
cd sync-my-cookie
yarn install        # or: npm install
yarn build          # or: npm run build
```

`yarn build` compiles the extension into `build/`. Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select that `build` folder. GitHub sign-in uses the extension's registered OAuth App; see [GitHub OAuth app (builds)](#github-oauth-app-builds) to use a different one.

If the build fails with `error:0308010C:digital envelope routines::unsupported`, webpack 4 needs to be run with the legacy OpenSSL provider:

```bash
NODE_OPTIONS=--openssl-legacy-provider yarn build
```

### Development build

```bash
NODE_OPTIONS=--openssl-legacy-provider yarn dev:chrome
```

This watches the source files and rebuilds into `build/`. Click the reload icon for the extension on `chrome://extensions` after a rebuild; reopen the popup after popup-only changes.

To build the distributable zip locally:

```bash
make
```

It produces `sync-my-cookie-<version>.zip` in the repository root.

## Scenes to be used
### Avoid frequent logins
Some cookies that remain login status will expire when the browser is closed, which causes us to log in frequently.

You can save the cookies of this website after login and enable `Auto Merge`. This way, even if the browser is closed, the login status of the website will not disappear.

### Share account
Maybe you have the following requirements:
- Share account with friends
- Break the limit of single sign-on
- Sync login status across multiple browsers

Using SyncMyCookie can easily meet the above requirements.

You can log in on one browser and enable `Auto Push`. On other browsers, enable `Auto Merge` so your login status will sync across these browsers.
  
## Configuration
In order to share cookies across devices, this extension encrypts your cookies and saves them in a GitHub Gist. You need a GitHub account.

If you have suggestions for using other types of storage to save data, please create an issue [here](https://github.com/ElementumOrg/sync-my-cookie/issues).

### Sign in with GitHub
Right click on the extension and click on `Options`.

![right click](./assets/docs/right_click.jpg)

Click **Sign in with GitHub**. A dialog shows a short code; enter it on <https://github.com/login/device> and authorize the extension. Only the `gist` scope is requested; you don't need to create a personal access token.

### Configure Extension
After signing in, set a password to encrypt the data and click `Set`. The password is the encryption key for the Gist data, so use the same password on every browser.

Now feel free to use this extension.

Note: If the optional `Gist ID` and `Filename` fields are empty, the extension reuses the newest existing sync Gist, or creates one if none exists. To synchronize cookies between two browsers, use the same `password`, `Gist ID` and `Filename` on both; each browser must sign in with GitHub separately. The Import/Export buttons copy the password, Gist ID and Filename configuration between browsers; they do not copy the GitHub authorization.

### GitHub OAuth app (builds)
The extension ships with the public Client ID of its registered GitHub OAuth App, so a normal build needs no OAuth configuration. The registered app must have **Device Flow** enabled in GitHub's settings; the Authorization callback URL is unused by the device flow.

To build against a different OAuth App, create one, enable **Device Flow** in its settings, and override the Client ID:

   ```bash
   GITHUB_CLIENT_ID=<client-id> NODE_OPTIONS=--openssl-legacy-provider yarn build
   ```

Because the device flow uses only a public client ID, it works for unpacked/manual installs regardless of the extension ID, and no secret is embedded in the extension.

## Usage
### Push cookies
To push your cookies for specific website to gist storage, just open this extension while browsing that website and click `Push`.

![push](./assets/docs/push.jpg)

### Merge cookies
To read saved cookies for specific website from gist and make chrome take them, just select that website from list and click `Merge`.

![merge](./assets/docs/merge.jpg)

### Auto Merge
When the `Auto Merge` feature is turned on for a given site, the extension automatically reads the saved cookies of the site from Gist and merge them **each time the browser is opened**.

![Auto Merge](./assets/docs/auto_merge.jpg)

When the browser starts, you can see a red badge on the extension indicating the number of websites that successfully perform `Auto Merge`.

![Auto Merge Badge](./assets/docs/auto_merge_badge.jpg)

### Auto Push
When the `Auto Push` feature is turned on for a given site, the extension automatically push the cookies of the site to Gist **when they change**.

![Auto Push](./assets/docs/auto_push.jpg)

You can see a green badge on the extension indicating the number of websites that successfully perform `Auto Push`.

![Auto Push Badge](./assets/docs/auto_push_badge.jpg)

#### Configure Auto Push
Usually, only a few values in cookies are critical. Configuring `Auto Push` rules allows the extension to perform `Auto Push` only when the specified value is updated.

Hover over the `Push` icon and click the configuration button that appears.

![Config Auto Push Entry](./assets/docs/config_auto_push_entry.jpg)

Select or input any name that you want to `Auto Push` when they change:

![Config Auto Push](./assets/docs/config_auto_push.jpg)

## Security
Since cookies are a very important security credential, please use this extension very carefully.

By using `HTTPS` and `AES-128-CBC`, this extension guarantees that your cookies are safe during the transfer and storage process, but you still need to be aware of the following:

- To keep your cookies safe, please don't disclose your configuration, especially your password. This will cause your cookies to be completely exposed to others.
- This extension requests only the `gist` scope during GitHub authorization.
- In theory, multiple devices using the same cookie can use some services at the same time, but this is related to the service provider's detection mechanism. So the risk of using this extension for account sharing is uncertain.

## LICENSE
MIT