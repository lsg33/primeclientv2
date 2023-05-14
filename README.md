![Banner](https://cdn.nexusfn.net/file/2023/05/Banner.png)

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/) 
![size](https://img.shields.io/github/repo-size/Nexus-FN/Momentum?label=Size&style=for-the-badge)

Momentum is a fork of the popular Fortnite Backend LawinServer. It is aimed to improve the stability and be more suitable for production use.

### Installation

#### Requirements

- MongoDB
- Redis (Soon Optional)
- NodeJS
- NPM
- Discord Bot
- Cloudflare R2 Bucket (Soon Optional)

#### Using Docker (Recommended)

Create an `.env` file with the following contents:

```env
MONGO_URI="mongodb://yourmonguri"
S3_BUCKET_NAME="yourbucketname"
S3_ENDPOINT="https://yourbucketendpoint"
S3_ACCESS_KEY_ID="youraccesskeyid"
S3_SECRET_ACCESS_KEY="yoursecretaccesskey"
INFO_UID="Name it whatever you want (But no spaces!), eg. Momentum"
BOT_TOKEN="Your discord bot token"
CLIENT_ID="Your discord bot client id"
GUILD_ID="Your discord guild id"
GLOBALCHATENABLED="true"
NAME="Name it whatever you want (But no spaces!), eg. Momentum"
USE_REDIS = "true"
```

Pull the Docker image using the following command:

```bash 
docker pull ghcr.io/nexus-fn/momentum
```

Then run the Docker image using the following command:

```bash
docker run -d -p 8080:8080 80:80 nexus-fn/momentum --env-file .env
```

#### Using NodeJS (Windows and Linux)

- Download the repository and extract it.
- Install NodeJS and NPM. (https://nodejs.org/en/download/)
- Rename .env.example to .env and fill in the values.

```powershell
npm install
npm run build
npm run start
```


#### Features

* CloudStorage and ClientSettings (Settings Saving).
* Account:
  + 2FA
  + Suspicous Login Detection
* Locker:
    + Changing items.
    + Changing item edit styles.
    + Favoriting items.
    + Marking items as seen.
* Friends:
    + Adding friends.
    + Accepting friend requests.
    + Removing friends.
    + Blocking friends.
* Item Shop:
    + Customizable Item Shop.
    + Purchasing items from the Item Shop.
* Matchmaking:
  * Matchmaking with friends.
  * Matchmaking with random players.
  * Random server selection.
  * Waiting until server is ready.
