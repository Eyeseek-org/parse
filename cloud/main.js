"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./generated/evmApi");
require("./generated/solApi");
const moralis_1 = __importDefault(require("moralis"));
Parse.Cloud.define('getPluginSpecs', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return [];
});
Parse.Cloud.define('getServerTime', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return null;
});
Parse.Cloud.define('firstOne', async () => {
    //@ts-ignore
    web3 = new moralis_1.default.Web3(
    //@ts-ignore
    new moralis_1.default.Web3.providers.HttpProvider("https://rpc-mumbai.maticvigil.com"));
    //@ts-ignore
    const abi = [
        {
            constant: true,
            inputs: [],
            name: "name",
            outputs: [{ name: "", type: "string" }],
            payable: false,
            stateMutability: "view",
            type: "function",
        },
    ];
    const address = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
    //@ts-ignore
    const contract = new web3.eth.Contract(abi, address);
    console.log(contract);
    function getRandomInt() {
        return Math.floor(Math.random());
    }
    // Saves new item to the DB
    console.log('done');
    const test = new Parse.Object('TestObject');
    await test.save({ random: getRandomInt() });
    const query = new Parse.Query('TestObject');
    query.equalTo('random', 0);
    // Take the first item from the DB and change its value
    // For each might be good
    const result = await query.first();
    result.set('random', 1);
    await result.save();
    // TBD ethers
    return ({
        result: "good",
    });
});
// Test ethers contract read/write
// Test database operations (create, read, update, delete)
//# sourceMappingURL=main.js.map