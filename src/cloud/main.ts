/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
declare const Parse: any;
import './generated/evmApi';
import './generated/solApi';
import { requestMessage } from '../auth/authService';
import { ethers } from "ethers"
import { Framework } from "@superfluid-finance/sdk-core";
import cron from 'node-cron';


const net = {
  name: 'mumbai',
  chainId: 80001,
  _defaultProvider: (providers: any) => new providers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com')
};

let provider = ethers.getDefaultProvider(net);
let privateKey = process.env.PRIVATE_KEY;
let fundingAddress = '0x77D3533eeBAA48e54b6C69EF66149a25494c34E2'


Parse.Cloud.define('requestMessage', async ({ params }: any) => {
  const { address, chain, networkType } = params;

  const message = await requestMessage({
    address,
    chain,
    networkType,
  });

  return { message };
});

cron.schedule('* * * * *', async() => {
  const res = await syncStreams();
  console.log(res);
});

const getFlowData = async (sender: string, receiver: string) => {
  // Key service to retrieve current deposit 
  const sf = await Framework.create({
    provider: provider,
    chainId: 80001
  })
  const DAIxContract = await sf.loadSuperToken("fDAIx");
  const DAIx = DAIxContract.address;
  try {
    const flow = await sf.cfaV1.getFlow({
      superToken: DAIx,
      sender: sender,
      receiver: receiver,
      providerOrSigner: provider
    })
    return flow
  } catch (err) {
    console.log(err)
  }
}

async function syncStreams () {
  const query = new Parse.Query("Stream");
  query.equalTo("isActive", true)
  const result = await query.find()

  for (let i = 0; i < result.length; i++) {
    const stream = result[i];
    const flow = await getFlowData(stream.get('owner'), stream.get('addressBacker'))
    console.log(flow)
    if (!flow || flow.flowRate == '0') {
      stream.set('isActive', false)
      await stream.save()
      console.log('deactivated', i)
    } else {
      const flowRate = flow.flowRate.toString()
      stream.set('flowRate', flowRate)
      console.log('updated', i)
    }
  }

}

Parse.Cloud.define('getPluginSpecs', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return [];
});
Parse.Cloud.define('getServerTime', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return null;
});

// Test function 
Parse.Cloud.define('firstOne', async () => {

    const tokenAddress = '0x027FC11f7cB537F180aD46186CDc382A353e6E15'
    const tokenAbi = erc20Abi;
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
    const contract = new ethers.Contract(fundingAddress, abi, provider);
     //@ts-ignore
    let walletWithProvider = new ethers.Wallet(privateKey, provider);

    // Read contract function
    const result = await contract.funds(1);

    // Write contract function
     // Contribute - amountM, amountD, id, currency, rewardId
    const createFund = await contract.connect(walletWithProvider).contribute(0,1000000,1,1,0)
    
    return createFund
});

// Goes through all projects and tries to distribute them
Parse.Cloud.define('deadline', async () => {

  const query = new Parse.Query("Project");
  query.equalTo("chainId", 80001)
  query.equalTo("type", "Standard")
  query.equalTo("status", 1) // Pass deadline 
  const all = await query.find({ useMasterKey: true });
  // Take deadline from the project, compare with current dateTime, if it's passed, change status to 2
  // Push notification to all users, bookmarks
  // Maintanance email for us // Implement email
});

// Goes through all projects and tries to distribute them
Parse.Cloud.define('distribute', async () => {
  let contract = new ethers.Contract(fundingAddress, abi, provider);
   //@ts-ignore
  let walletWithProvider = new ethers.Wallet(privateKey, provider);
  const query = new Parse.Query("Project");
  query.equalTo("chainId", 80001)
  query.equalTo("type", "Standard")
  query.equalTo("status", 2) // Pass deadline 
  const all = await query.find({ useMasterKey: true });
  // Fo each project retrieve projectId and call contract.distribute(pid)
//  (var i = 0; i < projects.length; i++) {
//     var project = projects[i];
//     var projectId = project.id;
//     console.log("Distributing project " + projectId);
//     contract.distribute(projectId);
//   }


 // If err, console.log('Cannot be distributed'), move on to the next
  // If ok, don't know what to do - Notify users, update state in the database (status = 2)
  // Add deadline to the db as well -> Query 
});

Parse.Cloud.define('getStreamData', async (request: any) => {
  let flowRate = 0;
  let deposited = 0;
  const query = new Parse.Query("Stream");
  query.equalTo("projectId", request.params.projectId)
  query.equalTo("isActive", true);
  const results = await query.find()
  for (let i = 0; i < results.length; ++i) {
    const sumFlow = Number(results[i].get("flowRate"));
    flowRate += sumFlow;
  }

  const depQuery = new Parse.Query("Project");
  depQuery.equalTo("projectId", request.params.projectId)
  const depResults = await depQuery.find()
  for (let i = 0; i < depResults.length; ++i) {
    const depFlow = Number(results[i].get("deposited"));
    deposited += depFlow;
  }

  // 2 loopy udělat - zvlášť pro total deposit 
  return {"flowRate" : flowRate, "deposited": deposited};
})


// Github check
// 1. Check if Github commit did happened in last two weeks
// Go through all Projects (type: Stream, status: active)) 
// 2. If yes, nothing
// 3. If not, notify negatively to all streamed users 
// 4. Pass it as Heroku cloud job (need to migrate in heroku)
Parse.Cloud.define('github', async () => {
  const query = new Parse.Query("Project");
  query.equalTo("type", "Stream")
  query.equalTo("status", 1)
  const all = await query.find({ useMasterKey: true });
  return all
});



// Checking before save 
Parse.Cloud.beforeSave('Project', async (request: any) => {
  const project = request.object;
  const tit = project.get('title');
  const query = new Parse.Query("Project");
  query.equalTo("title", tit);
  const first = await query.first({ useMasterKey: true });
  console.log("first" + first.title); // undefined
  console.log("tit"+ tit); // Good

  if (first && first.title == tit) {
    throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Project with this title already exists');
  } 
});

Parse.Cloud.job('test', async () => {
  const query = new Parse.Query("Project");
  const first = await query.first({ useMasterKey: true });
    
  return first
});

const abi =  [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "usdcAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "usdtAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "daiAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "Cancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "currency",
        "type": "uint256"
      }
    ],
    "name": "DistributionAccomplished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "donator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "currency",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "microDrained",
        "type": "uint256"
      }
    ],
    "name": "Donated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "FundCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "name": "FundingFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      }
    ],
    "name": "IncorrectDistribution",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cap",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "MicroClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cap",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "currency",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "microId",
        "type": "uint256"
      }
    ],
    "name": "MicroCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "MicroDrained",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "backer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "NftReward",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "name": "PlatformFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "backer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "Refunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "microOwner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "fundOwner",
        "type": "address"
      }
    ],
    "name": "Returned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardType",
        "type": "uint256"
      }
    ],
    "name": "RewardCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "backer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      }
    ],
    "name": "TokenReward",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "calcInvolvedMicros",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "calcOutcome",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "cancelFund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_fee",
        "type": "uint256"
      }
    ],
    "name": "changeFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amountM",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amountD",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_currency",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rewardId",
        "type": "uint256"
      }
    ],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_level1",
        "type": "uint256"
      }
    ],
    "name": "createFund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_fundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalNumber",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rewardAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_type",
        "type": "uint256"
      }
    ],
    "name": "createReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "createZeroData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dai",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "distribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "donations",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "backer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "state",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currency",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "funds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "state",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "level1",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "usdcBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "usdtBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "daiBalance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "getBackers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "getConnectedMicroFunds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "microFunds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "microId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "cap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "microBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "state",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currency",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155BatchReceived",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155Received",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rewardList",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rewardId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rewardItemId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "state",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rewardId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalNumber",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualNumber",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "erc20amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "nftId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "state",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_min",
        "type": "uint256"
      }
    ],
    "name": "setMinimum",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdt",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const erc20Abi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "subtractedValue",
        "type": "uint256"
      }
    ],
    "name": "decreaseAllowance",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "addedValue",
        "type": "uint256"
      }
    ],
    "name": "increaseAllowance",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]