import log from "../structs/log";

class update {

    async checkForUpdate(currentVersion: string) {

        const packageJsonRaw = await fetch('https://raw.githubusercontent.com/Nexus-FN/Momentum/main/package.json');
        const packageJson = await packageJsonRaw.json();

        log.debug("Latest version: " + packageJson.version);

        log.debug("Current version: " + currentVersion);

        if (packageJson.version !== currentVersion) {
            log.warn("Update available! " + currentVersion + " -> " + packageJson.version);
            log.warn("Download it from the GitHub repo or repull the image if you're using Docker");
        } else {
            log.backend("No update available");
        }
    }

}

export default new update();