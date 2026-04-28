<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/heading.png">
    <img src="images/heading-dark.png" width="80%">
  </picture>
</p>

<p align="center">
  <strong>KoInsight</strong> brings your <a href="https://koreader.rocks" target="_blank">KOReader</a> reading stats to life with a clean, web-based dashboard.
</p>

<p align="center">
  <a href='https://coveralls.io/github/GeorgeSG/KoInsight'><img src='https://coveralls.io/repos/github/GeorgeSG/KoInsight/badge.svg' alt='Coverage Status' /></a>
</p>

<p align="center">
   <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/screenshots/stats_1_d.png">
    <img src="images/screenshots/stats_1_l.png" width="100%">
  </picture>
</p>

#  Features

- 📈 Interactive dashboard with charts and insights
- ✏️ Highlights sync
- 🔄 KOReader plugin for syncing reading stats
- 📱 Multi-device support
- 📤 Manual .sqlite upload supported
- ♻️ Act as a KOReader (kosync) sync server
- 🏠 Fully self-hostable (Docker image available)

# Screenshots
<p><strong>Note:</strong>As of 2025-10-15 covers are not (yet) automatically displayed, as they are not part of the KOReader-generated database. If you want to see covers, you'll need to add them once per book. The UI offers a search by title and upload of images under the tab 'Cover Selector'.</p>

<table>
  <tr>
    <td><strong>Home page</strong></td>
    <td><strong>Book view</strong></td>
  </tr>
  <tr>
    <td><img src="images/screenshots/book_ld.png" width="300"/></td>
    <td><img src="images/screenshots/home_ld.png" width="300"/></td>
  </tr>
  <tr>
    <td><strong>Statistics</strong></td>
    <td><strong>Statistics</strong></td>
  </tr>
  <tr>
    <td><img src="images/screenshots/stats_1_ld.png" width="300"/></td>
    <td><img src="images/screenshots/stats_2_ld.png" width="300"/></td>
  </tr>
</table>

See all [screenshots](/images/screenshots/)


# Installation
Using [Docker](https://docker.com) and [Docker Compose](https://docs.docker.com/compose/)

Add the following to your `compose.yaml` file:

```yaml
name: koinsight
services:
  koinsight:
    image: ghcr.io/georgesg/koinsight:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./books:/app/books
    environment:
      - BOOKS_PATH=/app/books
      - KOINSIGHT_AUTH_USERNAME=admin
      - KOINSIGHT_AUTH_PASSWORD=changeme
```
Run `docker compose up -d`.

### GitHub Actions 自动发布到 GHCR
仓库已包含 `Docker Publish` workflow，会在推送到 `master` 或推送 `v*` 标签时自动构建并发布镜像到 GHCR。

- 镜像地址：`ghcr.io/<你的 GitHub 用户名或组织>/koinsight`
- 默认分支会更新 `latest` 标签
- 已发布多架构镜像：`linux/amd64`（群晖 **DS220+**）和 `linux/arm64`（Apple Silicon / **Mac M2**）

群晖 Docker / Container Manager 建议直接使用：

```yaml
services:
  koinsight:
    image: ghcr.io/<你的 GitHub 用户名或组织>/koinsight:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./books:/app/books
    environment:
      - BOOKS_PATH=/app/books
      - KOINSIGHT_AUTH_USERNAME=admin
      - KOINSIGHT_AUTH_PASSWORD=changeme
```

如果你在 Apple Silicon（如 Mac M2）上运行，也可使用同一个镜像标签，Docker 会自动拉取 `arm64` 变体。

# Configuration
KoInsight can be configured using the following environment variables:

- `HOSTNAME`: The hostname or IP address where the server will listen.<br>
  *Default:* `localhost`
- `PORT`: The port number for the web server.<br>
  *Default:* `3000`
- `MAX_FILE_SIZE_MB`: Maximum allowed size (in megabytes) for uploaded files.<br>
  *Default:* `100`
- `DATA_PATH`: Path to the directory where KoInsight data (such as stats or uploads) will be stored.<br>
  *Default:* `../../../data` or `/app/data` in Docker.
- `BOOKS_PATH`: Path to the directory where your ebook files are stored for OPDS catalog browsing/download.<br>
  *Default:* `../../../books` or `/app/books` in Docker.
- `KOINSIGHT_AUTH_USERNAME`: Shared username for web login prompt, OPDS endpoint, and upload endpoints.<br>
  *Default:* `admin`
- `KOINSIGHT_AUTH_PASSWORD`: Shared password for web login prompt, OPDS endpoint, and upload endpoints.<br>
  *Default:* `admin`

# Usage

## Reading statistics

To start seeing data in KoInsight, you need to upload your reading statistics.
Currently, there are two ways to do this:

1. **Manual upload**: Extract your `statistics.sqlite` (in settings folder) file from KOReader and upload it using the **"Upload Statistics DB"** button in KoInsight.
2. **Sync plugin**: Install and configure the KoInsight plugin in KOReader to sync your data directly.

### KOReader sync plugin
The KoInsight plugin syncs your reading statistics from KOReader to KoInsight.

**Installation:**
1. Download the plugin ZIP bundle from the **"KOReader Plugin"** button in the main menu.
1. Extract it into your `KOReader/plugins/` folder.
1. For the plugin to be installed correctly, the file structure should look like this:
    ```
    koreader
    └── plugins
        └── koinsight.koplugin
            ├── _meta.lua
            ├── main.lua
            └── ...
    ```

**Usage:**
1. Open the KOReader app.
1. Go to the **Tools** menu and open **KoInsight** (it should be below "More tools").
1. Click **Configure KoInsight** and enter your KoInsight server URL (e.g., `http://server-ip:3000`).
    - ⚠️ Make sure your KOReader device has network access to the server.
1. Click **Sync** in the KoInsight plugin menu.

Reload the KoInsight web dashboard. If everything went well (🤞), your data should appear.

### Manual Upload: `statistics.sqlite`
1. Open a file manager on your KOReader device.
1. Navigate to the `KOReader/settings/` folder.
1. Locate the `statistics.sqlite` file.
1. Copy it to your computer.
1. Upload it to KoInsight using the **"Upload Statistics DB"** button.
1. Reload the KoInsight web dashboard.

Every time you need to reupload data, you would need to upload the statistics database file again.


## Use as progress sync server

You can use your KoInsight instance as a KOReader sync server. This allows you to sync your reading progress across multiple devices.

1. Open the KOReader app.
1. Go to the **Tools** menu and open **Progress sync**
1. Set the server URL to your KoInsight instance (e.g., `http://server-ip:3000`).
1. Register an account and login.
1. Sync your progress.

The progress sync data should appear in the **"Progress syncs"** page in KoInsight.

## OPDS catalog

KoInsight now exposes an OPDS acquisition feed so KOReader (or any OPDS client) can browse and download your local ebook files.

1. Mount your books folder to the container (for example `./books:/app/books`).
2. Set `BOOKS_PATH` to the in-container path (`/app/books`).
3. Open OPDS URL in your reader: `http://<server-ip>:3000/opds` (enter `KOINSIGHT_AUTH_USERNAME` / `KOINSIGHT_AUTH_PASSWORD` when prompted).

Supported formats: `epub`, `pdf`, `mobi`, `azw3`, `fb2`, `txt`, `cbz`, `cbr`.


# Development
See [DEVELOPMENT.md](DEVELOPMENT.md) for development setup and instructions.

# Roadmap
(a.k.a things I want to do)

See [Project board](https://github.com/users/GeorgeSG/projects/2)
