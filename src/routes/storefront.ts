import express, { Request, Response } from "express";
const Profile = require("../model/profiles.js");
const Friends = require("../model/friends.js");
const functions = require("../structs/functions.js")
import { verifyToken } from "../tokenManager/tokenVerify.js";
const keychain = require ("../../responses/keychain.json");
const error = require("../structs/error.js")

const app = express.Router();

app.get("/fortnite/api/storefront/v2/catalog", (req: Request, res: Response) => {
    if (req.headers["user-agent"].includes("2870186")) {
        return res.status(404).end();
    }

    res.json(functions.getItemShop());
});

app.get("/fortnite/api/storefront/v2/gift/check_eligibility/recipient/:recipientId/offer/:offerId", verifyToken, async (req: Request, res: Response) => {
    const findOfferId = functions.getOfferID(req.params.offerId);
    if (!findOfferId) {
        return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Offer ID (id: "${req.params.offerId}") not found`,
            [req.params.offerId], 16027, undefined, 400, res
        );
    }

    const sender: any = await Friends.findOne({ accountId: req.user.accountId }).lean();
    const acceptedFriend = sender!.list.accepted.find(i => i.accountId == req.params.recipientId);

    if (!acceptedFriend && req.params.recipientId != req.user.accountId) {
        return error.createError(
            "errors.com.epicgames.friends.no_relationship",
            `User ${req.user.accountId} is not friends with ${req.params.recipientId}`,
            [req.user.accountId, req.params.recipientId], 28004, undefined, 403, res
        );
    }

    const profiles = await Profile.findOne({ accountId: req.params.recipientId });
    const athena = profiles!.profiles["athena"];

    for (const itemGrant of findOfferId.offerId.itemGrants) {
        if (athena.items.some(item => itemGrant.templateId.toLowerCase() == item.templateId.toLowerCase())) {
            return error.createError(
                "errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed",
                `Could not purchase catalog offer ${findOfferId.offerId.devName}, item ${itemGrant.templateId}`,
                [findOfferId.offerId.devName, itemGrant.templateId], 28004, undefined, 403, res
            );
        }
    }

    res.json({
        price: findOfferId.offerId.prices[0],
        items: findOfferId.offerId.itemGrants
    });
});

app.get("/fortnite/api/storefront/v2/keychain", (req: Request, res: Response) => {
    res.json(keychain);
});

app.get("/catalog/api/shared/bulk/offers", (req: Request, res: Response) => {
    res.json({});
});

module.exports = app;