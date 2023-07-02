import fs from 'fs';
import path from 'path';
import Safety from './safety';
import safety from './safety';
import error from './structs/error';
import log from './structs/log';

class Shop {

    public async testKey() {

        const test = await fetch(`http://api.nexusfn.net/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
            method: 'GET',
            headers: {
                'x-api-key': safety.env.SHOP_API_KEY
            }
        }).then((res) => {
            if (res.status == 401) {
                log.error("Invalid Shop API key. If you don't want to use auto-rotate, then leave the key blank.");
                return process.exit(1);
            }
        });

        log.backend("Shop API key is valid");

        return;

    }

    public async updateShop(): Promise<string[]> {

        const newItems: any[] = [];

        const shop = await fetch(`http://127.0.0.1:8080/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
            method: 'GET',
            headers: {
                'x-api-key': safety.env.SHOP_API_KEY
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

            //console.log(`Added ${shopName} to catalog as daily with price ${itemPrice}`);

        }

        for (let i = 0; i < shopJSON[1].featured.length; i++) {
            const shopName = shopJSON[1].featured[i].shopName;
            const itemPrice = shopJSON[1].featured[i].price;

            catalog[`featured${i + 1}`].price = itemPrice;
            catalog[`featured${i + 1}`].itemGrants = [`${shopName}`];

            newItems.push(shopJSON[1].featured[i]);

            //console.log(`Added ${shopName} to catalog as featured with price ${itemPrice}`);

        }

        fs.writeFileSync(path.join(__dirname, "../../Config/catalog_config.json"), JSON.stringify(catalog, null, 4));

        const catalogRaw = fs.readFileSync(path.join(__dirname, "../../responses/catalog.json"));
        const catalogJson = JSON.parse(catalogRaw.toString());

        catalogJson.expiration = new Date(Date.now() + 86400000).toISOString();
        //set expiration to current time + 24 hours

        fs.writeFileSync(path.join(__dirname, "../../responses/catalog.json"), JSON.stringify(catalogJson, null, 2));

        return newItems;
    }
}

export default new Shop();
