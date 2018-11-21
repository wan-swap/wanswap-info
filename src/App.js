//https://gifer.com/en/1FNa unicorn dance gif

import React, { Component } from 'react';
import Uniswap from './Uniswap.js';  
import Web3 from 'web3'  
import './App.css';

function GetTime(block) {
  return (
    "2 min ago" // TODO
  )
}

function EventRow(e) {
  
  let txLink = "https://etherscan.io/tx/" + e.tx;
  let blockLink = "https://etherscan.io/block/" + e.block;
  let providerLink = "https://etherscan.io/address/" + e.provider;
  let rowClassName = "";

  if (e.provider.toUpperCase() === "0xa7f3dfed2bcf7b35a8824e11ae8f723650edfb58".toUpperCase()) {
    rowClassName = "myTransaction";
  }

  return (
    <tr key={e.tx} className={rowClassName}>
      <td><a href={txLink} target="_blank"><div className="truncate">{e.tx}</div></a></td>
      <td><a href={blockLink} target="_blank">{e.block}</a></td>
      <td>{GetTime(e.block)}</td>
      <td><a href={providerLink} target="_blank"><div className="truncate">{e.provider}</div></a></td>
      <td>{e.type}</td>
      <td>{e.numEth}</td>
      <td>{e.numTokens}</td>
      <td>{e.curPoolShare}</td>
      <td>{e.liquidtyProviderFee}</td>
    </tr>
  );
}

function EventTableBody(props) {
  let eventList = props.eventList;

  return eventList.map(e => {
    return (
      EventRow(e)
    )
  });
}

function EventTable(props) {
  console.log(props.tokenType + " <<");
  return (  
  <table>
    <thead>
    <tr>
    <th>Transaction</th>
    <th>Block</th>
    <th>Time</th>
    <th>Address</th>
    <th>Event</th>
    <th>Pool Adjustment (ETH)</th>
    <th>Pool Adjustment ({props.tokenType})</th>
    <th>Pool Share</th>
    <th>Provider Fee</th>
    </tr>
    </thead>
   <tbody>
    {EventTableBody(props)}
  </tbody>
  </table>
  )
}

class App extends React.Component {  
  constructor() {
    super(); 

    this.appName = 'Uniswap Events'; 
    this.isWeb3 = true;
    this.isWeb3Locked = false; //If metamask account is locked
    this.tokenType = "";
    this.providerFeePercent = 0;

    this.curEthPoolTotal = "";
    this.curTokenPoolTotal = "";
    this.curPoolShare = "";

    this.eventList = [];

    this.myAddress = "";
    this.myCollectedFees = "";

    this.state = {            
      myAddress : "Locked",

      curEthPoolTotal : "-",
      curTokenPoolTotal : "-",
      curPoolShare : "-",
      myCollectedFees : "-",
      tokenType : "MKR",
      providerFeePercent : 0.003,
    } 

    let web3 = window.web3; 

    console.log(web3.version);

    if (typeof web3 !== 'undefined') {
      this.web3Provider = web3.currentProvider;

      web3 = new Web3(web3.currentProvider);

      web3.eth.getBlockNumber().then((blockNumber) => {

        let address = Uniswap.address;
        let abi = Uniswap.abi;

        let contract = new web3.eth.Contract(abi, address);
        // let contractInstance = contractRef.at(address);

        // console.log(Uniswap.address);
        // console.log(events);
        console.log(Web3.version);
        console.log(blockNumber);

        // get the user address
        web3.eth.getCoinbase().then((coinbase) => {
            if (coinbase === null) {
              coinbase = "Locked";
            }

            this.myAddress = coinbase;
            this.setState({ 
              myAddress : coinbase
            });      

          let options = {
            address: address,
            // fromBlock: (blockNumber - 150000),
            fromBlock:6629098,
            // fromBlock: (blockNumber - 9000),
            toBlock: 'latest',
            // topics: [["0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f",
            // "0x06239653922ac7bea6aa2b19dc486b9361821d37712eb796adfd38d81de278ca",
            // "0x7f4091b46c33e918a0f3aa42307641d17bb67029427a5369e54b353984238705"]]
            // "0x0fbf06c058b90cb038a618f8c2acbf6145f8b3570fd1fa56abb8f0f3f05b36e8"]]

          };

          // topics
          // 0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f = TokenPurchase      
          // 0x06239653922ac7bea6aa2b19dc486b9361821d37712eb796adfd38d81de278ca = AddLiquidity
          // 0x7f4091b46c33e918a0f3aa42307641d17bb67029427a5369e54b353984238705 = EthPurchase
          // 0x0fbf06c058b90cb038a618f8c2acbf6145f8b3570fd1fa56abb8f0f3f05b36e8 = RemoveLiquidity 

          let that = this;

          var events = contract.getPastEvents("allEvents", options).then((events) => {
            console.log(events);

            let eventListTemp = [];

            let curEthTotal = 0;
            let curTokenTotal = 0;

            let curPoolShare = 0.0;

            let numMyShareTokens = 0.0;
            let numMintedShareTokens = 0.0;

            let lastEventObj;

            events.forEach((e) => {
              let eventType = e.event;

              let eventObj = {
                type : eventType,

                curPoolShare : 0.0,

                numEth : 0,
                numTokens : 0,
                
                tx : e.transactionHash,
                provider : e.returnValues.provider,
                block : e.blockNumber,

                liquidtyProviderFee : "-"
              }

              // if (e.blockNumber >= 6738238) return;//TODO remove

              let eth, tokens;

              if (eventType === "AddLiquidity") {
                eth = e.returnValues[1] / 1e18;
                tokens = e.returnValues.token_amount / 1e18;

                eventObj.type = "Add Liquidty";
              } else if (eventType === "RemoveLiquidity") {
                eth = -e.returnValues.eth_amount / 1e18;
                tokens = -e.returnValues.token_amount / 1e18;

                eventObj.type = "Remove Liquidty";
              } else if (eventType === "TokenPurchase") {
                eth = e.returnValues.eth_sold / 1e18;
                tokens = -e.returnValues.tokens_bought / 1e18;
                
                eventObj.provider = e.returnValues.buyer; 

                eventObj.liquidtyProviderFee = -tokens * this.state.providerFeePercent + " MKR"; //"TODO"; // TODO

                eventObj.type = "Swap";
              } else if (eventType === "EthPurchase") {
                eth = -e.returnValues.eth_bought / 1e18;
                tokens = e.returnValues.tokens_sold / 1e18;

                eventObj.provider = e.returnValues.buyer; 

                eventObj.liquidtyProviderFee = -eth * this.state.providerFeePercent + " ETH"; //"TODO"; // TODO

                eventObj.type = "Swap";
              } else if (eventType == "Transfer") {
                // Track share tokens
                let sender = e.returnValues[0];
                let receiver = e.returnValues[1];
                let numShareTokens = e.returnValues[2] / 1e18;
                        
                // check if this was mint or burn share tokens        
                if (receiver === "0x0000000000000000000000000000000000000000") {
                  // burn share tokens
                  numMintedShareTokens -= numShareTokens;

                  // check if the sender was user
                  if (sender.toUpperCase() === this.myAddress.toUpperCase()) {
                      numMyShareTokens -= numShareTokens;
                  }
                } else {
                  // mint share tokens
                  numMintedShareTokens += numShareTokens;

                  if (receiver.toUpperCase() === this.myAddress.toUpperCase()) {
                      numMyShareTokens += numShareTokens;
                  }
                }

                // update current pool share. take users's share tokens and divide by total minted share tokens
                curPoolShare = numMyShareTokens / numMintedShareTokens;
                // round to 4 decimals
                curPoolShare = Math.round( curPoolShare * 1e4 ) / 1e4;  
                // get a percentage
                curPoolShare = (curPoolShare * 100);      
                // now only keep 2 decimals for clarity
                curPoolShare = curPoolShare.toFixed(2);

                // if the user's pool share is 0, don't show a number
                if (curPoolShare == 0.0) {
                  curPoolShare = "-";
                } else {
                  curPoolShare = curPoolShare  + "%";
                }

                // set it on the last event object before this transfer
                lastEventObj.curPoolShare = curPoolShare;

                return;
              }

              // save a reference to the last event object (transfer events follow add/remove liquidity)
              lastEventObj = eventObj;

              // update the total pool eth total
              curEthTotal += eth;              

              // update the total pool token total
              curTokenTotal += tokens;

              // set the number of eth and tokens for this event
              eventObj.numEth = eth.toFixed(2);
              eventObj.numTokens = tokens.toFixed(2);

              // set the user's current pool share %
              eventObj.curPoolShare = curPoolShare;

              // push this event object onto the array
              eventListTemp.push(eventObj);

            });

            // reverse the list so the most recent events are first
            eventListTemp.reverse();

            // update our state
            that.setState({  
              eventList : eventListTemp,

              curEthPoolTotal : curEthTotal.toFixed(2),
              curTokenPoolTotal : curTokenTotal.toFixed(2),

              curPoolShare : curPoolShare,

              // myCollectedFees : "-0.02 ETH, 0.23 MKR",
              myCollectedFees : "-",
            });
          });
      });
    });
  } else {
    this.isWeb3 = false;
  }
}

setNetwork = () => {  
  if (typeof this.web3 ==! 'undefined') {
    let networkName, that = this;  

    this.web3.eth.net.getId((err,networkId) => {            
      that.setState({  
        network: networkId  
      });
    });
  }
}

componentDidMount() {  
  this.setNetwork();

}

renderEvents() {
  if (typeof this.state.eventList === 'undefined') {
    return (
      <div/>
      ) 
  }

  return (
   <EventTable eventList={this.state.eventList} tokenType={this.state.tokenType}/>
  );
}

renderCoinbase() {
  return (
    <table>
    <thead>
    <tr>
      <th>Address</th>
      <th>Pool Size (ETH)</th>
      <th>Pool Size ({this.state.tokenType})</th>
      <th>Pool Share</th>
      <th>Accrued Fees</th>
      </tr> 
    </thead>
    <tbody>
      <tr>
        <td><div className="truncate">{this.state.myAddress}</div></td>
        <td>{this.state.curEthPoolTotal}</td>
        <td>{this.state.curTokenPoolTotal}</td>
        <td>{this.state.curPoolShare}</td>
        <td>{this.state.myCollectedFees}</td>
      </tr>
    </tbody>
    </table>
  );
}

render() {  
  if(this.isWeb3) {      
      return (  
      <div>
      {this.renderCoinbase()}
      {this.renderEvents()}
      </div>  
      ) 
  } else{  
    return(  
    <div>Install Metamask</div>
    ) 
  } 
}
} 

export default App; 