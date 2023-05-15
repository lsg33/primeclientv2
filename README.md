![Banner](https://cdn.nexusfn.net/file/2023/05/Banner.png)

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/) 
![size](https://img.shields.io/github/repo-size/Nexus-FN/Momentum?label=Size&style=for-the-badge)
![](https://komarev.com/ghpvc/?username=Nexus-FN&style=for-the-badge)

Momentum is a fork of the popular Fortnite Backend LawinServer. It is aimed to improve the stability and be more suitable for production use.

I just released a new NPM package called "MomentumSDK" which allows you to easily interact with Momentum. You can find it here:

[![NPM](https://nodei.co/npm/momentumsdk.png?downloads=true&downloadRank=true&stars=true)](https://npmjs.org/molmentumsdk)

### Installation

While the installation may look hard and complex, it's actually really simple and takes about 5-10 minutes, I will make a Youtube Tutorial about it soon though.

#### Requirements

- Upstash Redis (Soon Optional) [Find out how to create a redis database here](https://github.com/Nexus-FN/Momentum), it's really simple.
- NodeJS Download [here](https://nodejs.org/en)
- NPM (Automatically installed when installing NodeJS)
- Discord Bot [Create one here](https://discord.com/developers/)
- Cloudflare R2 Bucket / S3 Bucket (Soon Optional) [Find out how to create one here](https:/github.com/Nexus-FN/Momentum)

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
USE_REDIS="true"
REDIS_TOKEN="Your upstash token"
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
- Rename .env.example to .env and fill in the required values. (Requirements can be found at the top of this page)

```powershell
npm install
npm run build
npm run start
```


#### New Features
Features that do not exist in LawinV2

* CloudStorage and ClientSettings (Settings Saving) in the Cloud.
* Account:
  + 2FA
  + Suspicous Login Detection
* Matchmaking:
  * Matchmaking with friends.
  * Random server selection.
  * Waiting until server is ready.
