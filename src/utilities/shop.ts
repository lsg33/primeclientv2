import fs from 'fs';
import path from 'path';
import Safety from './safety';
import log from './structs/log';

class Shop {

    public async testModule(loopKey): Promise<boolean> {

        const test = await fetch(`http://api.nexusfn.net/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
            method: 'GET',
            headers: {
                'loopkey': loopKey
            }
        })

        await test.json()

        if (test.status == 200) {
            return true;
        } else {
            log.warn("Auto rotate has been disabled as you do not have access to it or some unknown error happened. Please go to https://discord.gg/NexusFN and enter the /purchase command to gain access or if you think this is a mistake then please contact a staff member.");
            return false;
        }

    }

    public async updateShop(loopKey: string): Promise<string[]> {

        const newItems: any[] = [];

        const shop = await fetch(`https://api.nexusfn.net/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
            method: 'GET',
            headers: {
                'loopkey': loopKey
            }
        })

        if (!shop) return [];

        const shopJSON = await shop.json();
        const dailyItems = shopJSON[0].daily;

        const catalogString = fs.readFileSync(path.join(__dirname, "../../Config/catalog_config.json")).toString();
        const catalog = JSON.parse(catalogString);

        for (let i = 0; i < dailyItems.length; i++) {
            const shopName = dailyItems[i].shopName;
            const itemPrice = dailyItems[i].price;

            catalog[`daily${i + 1}`].price = itemPrice;
            catalog[`daily${i + 1}`].itemGrants = [`${shopName}`];

            newItems.push(dailyItems[i]);

        }

        for (let i = 0; i < shopJSON[1].featured.length; i++) {
            const shopName = shopJSON[1].featured[i].shopName;
            const itemPrice = shopJSON[1].featured[i].price;

            catalog[`featured${i + 1}`].price = itemPrice;
            catalog[`featured${i + 1}`].itemGrants = [`${shopName}`];

            newItems.push(shopJSON[1].featured[i]);

        }

        fs.writeFileSync(path.join(__dirname, "../../Config/catalog_config.json"), JSON.stringify(catalog, null, 4));

        return newItems;
    }
}

export default new Shop();
