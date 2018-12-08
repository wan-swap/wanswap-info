import React, { Component } from "react";
import lifecycle from "react-pure-lifecycle";

import "react-table/react-table.css";

import { defaults } from "react-chartjs-2";

import { Bar } from "react-chartjs-2";

import { BigNumber } from "bignumber.js";

import TokenPoolDetails from "./TokenPoolDetails/TokenPoolDetails.js";
import TokenPoolHistory from "./TokenPoolHistory/TokenPoolHistory.js";

import Uniswap from "./Uniswap.js";

import { useWeb3Context } from "web3-react/hooks";

import "./App.css";

var app;

var web3 = null;

var didRequestData = false;
var didReceiveData = false;

var eventList = [];
var volumeDataMap = {};

var curFactory = "";

var curEthPoolTotal = "-";
var curTokenPoolTotal = "-";
var curPoolShare = "-";

var myCollectedEthFees = "";
var myCollectedTokenFees = "";

var myAddress = "";
var tokenAddress = "";

var providerFeePercent = 0.003;

class App extends React.Component {
  constructor(props) {
    super(props);

    app = this;

    defaults.global.animation = false;
  }

  componentDidMount(props) {
    retrieveData();
  }

  componentWillMount(props) {
    var factory = Uniswap.initial;

    // check for URL Search Params support
    if ("URLSearchParams" in window) {
      // extract factory token from URL if found
      var urlParams = new URLSearchParams(window.location.search);

      if (urlParams.has("token")) {
        factory = urlParams.get("token");
      }
    }

    curFactory = factory;
  }

  render() {
    var exchange = Uniswap.tokens[curFactory].address;

    return (
      <div>
        <div className="sidenav">
          <TokenSelector curFactory={curFactory} />
        </div>
        <div className="main-content">
          <TokenPoolDetails          	
            curFactory={curFactory}
            tokenAddress={tokenAddress}
            curEthPoolTotal={curEthPoolTotal}
            curTokenPoolTotal={curTokenPoolTotal}
            curPoolShare={curPoolShare}
            myCollectedEthFees={myCollectedEthFees}
            myCollectedTokenFees={myCollectedTokenFees}
            exchangeAddress={exchange}
          />
          <div>
            <TokenVolumeChart />
          </div>
          <TokenPoolHistory
            eventList={eventList}
            curFactory={curFactory}
            myAddress={myAddress}
            didReceiveData={didReceiveData}
          />
          <Attribution />
        </div>
      </div>
    );
  }
}

const Attribution = props => {
  return (
    <p className="attribution">
      <a href="https://github.com/conlan/uniswap-info" target="_blank">
        Github
      </a>{" "}
      |{" "}
      <a href="https://uniswap.io" target="_blank">
        Uniswap
      </a>{" "}
      |{" "}
      <a href="https://gifer.com/en/9mvB" target="_blank">
        GIF
      </a>
    </p>
  );
};

const TokenSelector = props => {
  if (web3 == null) {
    web3 = useWeb3Context();
  }

  return (
    <table className="token-selector">
      <tbody>
        <TokenSelectorRows activeFactory={props.curFactory} />
      </tbody>
    </table>
  );
};

const TokenSelectorRows = props => {
  var tokenRows = [];

  tokenRows.push([]);

  var activeFactory = props.activeFactory;

  var tokensPerRow = 1;

  var tokenKeys = Object.keys(Uniswap.tokens);

  for (var i = 0; i < tokenKeys.length; i++) {
    if (tokenRows[tokenRows.length - 1].length === tokensPerRow) {
      tokenRows.push([]);
    }

    var key = tokenKeys[i];

    tokenRows[tokenRows.length - 1].push(key);
  }

  return tokenRows.map((row, index) => {
    return (
      <tr key={index}>
        <TokenSelectorSingleRow
          tokensInRow={row}
          activeFactory={activeFactory}
        />
      </tr>
    );
  });
};

const TokenSelectorSingleRow = props => {
  var activeFactory = props.activeFactory;
  var tokensInRow = props.tokensInRow;

  var link = "";

  return tokensInRow.map(token => {
    var link = "?token=" + token;
    var isActiveFactory = token === activeFactory;

    if (isActiveFactory) {
      return (
        <td key={token} className="token-selector-active">
          <div className="token-selector-active">{token}</div>
        </td>
      );
    } else {
      return (
        <td key={token}>
          <a href={link}>{token}</a>
        </td>
      );
    }
  });
};

const TokenVolumeChart = props => {
  // don't render anything if we haven't loaded the events yet
  if (didReceiveData == false) {
    return <div />;
  }

  var labels = [];
  var volumeData = [];

  var monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  // calculate dataset
  var daysToShow = 30;

  var oneDayOffset = 24 * 60 * 60 * 1000;

  for (var daysBack = daysToShow - 1; daysBack >= 0; daysBack--) {
    var date = new Date(Date.now() - oneDayOffset * daysBack);
    // console.log(date);

    labels.push(
      monthNames[date.getMonth()] +
        " " +
        date.getDate() +
        ", " +
        date.getFullYear()
    );

    var dateKey =
      date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();

    if (dateKey in volumeDataMap) {
      volumeData.push(volumeDataMap[dateKey].toFixed(4));
    } else {
      volumeData.push(0);
    }
  }

  var data = {
    labels: labels,
    datasets: [
      {
        label: "Swap Volume (ETH)",
        backgroundColor: "rgba(160,160,160,1)",
        // borderWidth: 0,
        hoverBackgroundColor: "rgba(102,153,203,1)",
        // hoverBorderWidth: 0,
        data: volumeData
      }
    ]
  };

  return (
    <div className="volumeChart">
      <Bar
        data={data}
        height={250}
        options={{
          maintainAspectRatio: false,
          legend: {
            display: false
          }

        }}
      />
    </div>
  );
};

const retrieveData = () => {
  if (didRequestData) {
    return;
  }

  let exchangeAddress = Uniswap.tokens[curFactory].address;

  // get the token address
  var tokenDecimals = Math.pow(10, Uniswap.tokens[curFactory].decimals);

  var contract = new web3.web3js.eth.Contract(Uniswap.abi, exchangeAddress);

  let that = this;

  contract.methods
    .tokenAddress()
    .call()
    .then(function(tokenAddress_) {
      tokenAddress = tokenAddress_;

      app.setState({});
    });

  didRequestData = true;

  // get the user address
  web3.web3js.eth.getCoinbase().then(coinbase => {
    if (coinbase === null) {
      coinbase = "Locked";
    }

    myAddress = coinbase;

    let options = {
      address: exchangeAddress,
      fromBlock: 6627944,
      toBlock: "latest"
    };

    // topics
    // 0xcd60aa75dea3072fbc07ae6d7d856b5dc5f4eee88854f5b4abf7b680ef8bc50f = TokenPurchase
    // 0x06239653922ac7bea6aa2b19dc486b9361821d37712eb796adfd38d81de278ca = AddLiquidity
    // 0x7f4091b46c33e918a0f3aa42307641d17bb67029427a5369e54b353984238705 = EthPurchase
    // 0x0fbf06c058b90cb038a618f8c2acbf6145f8b3570fd1fa56abb8f0f3f05b36e8 = RemoveLiquidity

    var events = contract.getPastEvents("allEvents", options).then(events => {
      console.log(events);

      let eventListTemp = [];

      let curEthTotal = 0;
      let curTokenTotal = 0;

      curPoolShare = 0.0;

      let curPoolShareDisplay = 0.0;

      let numMyShareTokens = new BigNumber(0);
      let numMintedShareTokens = new BigNumber(0);

      let numMyDepositedEth = 0.0;
      let numMyDepositedTokens = 0.0;

      let lastEventObj;

      events.forEach(e => {
        let eventType = e.event;

        let eventObj = {
          type: eventType,

          curPoolShare: 0.0,

          numEth: 0,
          numTokens: 0,

          id: e.id,

          tx: e.transactionHash,
          provider: e.returnValues.provider,
          block: e.blockNumber,

          liquidtyProviderFee: "-",

          volume: 0 // how much swapping volume was in this event (set by purchase events only)
        };

        let eth, tokens;

        if (eventType === "AddLiquidity") {
          eth = e.returnValues[1] / 1e18;
          tokens = e.returnValues.token_amount / tokenDecimals;

          eventObj.type = "Add Liquidty";

          if (eventObj.provider.toUpperCase() === myAddress.toUpperCase()) {
            numMyDepositedEth += eth;
            numMyDepositedTokens += tokens;
          }
        } else if (eventType === "RemoveLiquidity") {
          eth = -e.returnValues.eth_amount / 1e18;
          tokens = -e.returnValues.token_amount / tokenDecimals;

          eventObj.type = "Remove Liquidty";

          if (eventObj.provider.toUpperCase() === myAddress.toUpperCase()) {
            numMyDepositedEth += eth;
            numMyDepositedTokens += tokens;
          }
        } else if (eventType === "TokenPurchase") {
          eth = e.returnValues.eth_sold / 1e18;
          tokens = -e.returnValues.tokens_bought / tokenDecimals;

          eventObj.provider = e.returnValues.buyer;
          eventObj.type = "Token Purchase";

          eventObj.volume = eth;

          // calculate the eth fee that liquidity providers will receive
          eventObj.liquidtyProviderFee =
            (eth * providerFeePercent).toFixed(4) + " ETH";
        } else if (eventType === "EthPurchase") {
          eth = -e.returnValues.eth_bought / 1e18;
          tokens = e.returnValues.tokens_sold / tokenDecimals;

          eventObj.provider = e.returnValues.buyer;
          eventObj.type = "Eth Purchase";

          eventObj.volume = -eth;

          // calculate the token fee that liquidity providers will receive
          eventObj.liquidtyProviderFee =
            (tokens * providerFeePercent).toFixed(4) + " " + curFactory;
        } else if (eventType === "Transfer") {
          // Track share tokens
          let sender = e.returnValues[0];
          let receiver = e.returnValues[1];
          let numShareTokens = new BigNumber(e.returnValues[2]); // / 1e18;

          // check if this was mint or burn share tokens
          if (receiver === "0x0000000000000000000000000000000000000000") {
            // burn share tokens
            numMintedShareTokens = numMintedShareTokens.minus(numShareTokens);

            // check if the sender was user
            if (sender.toUpperCase() === myAddress.toUpperCase()) {
              numMyShareTokens = numMyShareTokens.minus(numShareTokens);
            }
          } else {
            // mint share tokens
            numMintedShareTokens = numMintedShareTokens.plus(numShareTokens);

            if (receiver.toUpperCase() === myAddress.toUpperCase()) {
              numMyShareTokens = numMyShareTokens.plus(numShareTokens);
            }
          }

          // update current pool share. take users's share tokens and divide by total minted share tokens
          curPoolShare = new BigNumber(
            numMyShareTokens.dividedBy(numMintedShareTokens)
          );

          if (isNaN(curPoolShare) || curPoolShare.toFixed(4) == 0) {
            curPoolShare = 0;
            numMyDepositedEth = 0;
            numMyDepositedTokens = 0;
          }

          // get a percentage from the pool share
          curPoolShareDisplay = (curPoolShare * 100).toFixed(2);

          // if the user's pool share is 0, don't show a number
          if (curPoolShareDisplay == 0.0) {
            curPoolShareDisplay = "-";
          } else {
            curPoolShareDisplay = curPoolShareDisplay + "%"; // add a percentage symbol
          }

          // set it on the last event object before this transfer
          lastEventObj.curPoolShare = curPoolShareDisplay;

          return;
        }

        // save a reference to the last event object (transfer events follow add/remove liquidity)
        lastEventObj = eventObj;

        // update the total pool eth total
        curEthTotal += eth;

        // update the total pool token total
        curTokenTotal += tokens;

        // set the number of eth and tokens for this event
        eventObj.numEth = eth.toFixed(4);
        eventObj.numTokens = tokens.toFixed(4);

        // set the user's current pool share %
        eventObj.curPoolShare = curPoolShareDisplay;

        // push this event object onto the array
        eventListTemp.push(eventObj);
      });

      // reverse the list so the most recent events are first
      eventListTemp.reverse();

      // calculate how much fees we've accrued by determining how much eth/tokens we own minus what we've deposited/withdrawn
      let myEstimatedAccruedEthFees = (
        curPoolShare * curEthTotal -
        numMyDepositedEth
      ).toFixed(2);
      let myEstimatedAccruedTokenFees = (
        curPoolShare * curTokenTotal -
        numMyDepositedTokens
      ).toFixed(2);

      if (myEstimatedAccruedEthFees == 0) {
        myEstimatedAccruedEthFees = "";
      } else {
        myEstimatedAccruedEthFees = myEstimatedAccruedEthFees + " ETH";
      }

      if (myEstimatedAccruedTokenFees == 0) {
        myEstimatedAccruedTokenFees = "";
      } else {
        if (myEstimatedAccruedEthFees.length == 0) {
          myEstimatedAccruedTokenFees =
            myEstimatedAccruedTokenFees + " " + curFactory;
        } else {
          myEstimatedAccruedTokenFees =
            ", " + myEstimatedAccruedTokenFees + " " + curFactory;
        }
      }
      didReceiveData = true;

      eventList = eventListTemp;

      curEthPoolTotal = curEthTotal.toFixed(4);
      curTokenPoolTotal = curTokenTotal.toFixed(4);

      curPoolShare = curPoolShareDisplay;

      myCollectedEthFees = myEstimatedAccruedEthFees;
      myCollectedTokenFees = myEstimatedAccruedTokenFees;

      // update our state
      app.setState({});

      if (eventListTemp.length > 0) {
        var recentEvent = eventListTemp[0];
        var oldestEvent = eventListTemp[eventListTemp.length - 1];
        var dateKeyToVolumeMap = {};

        // get the timestamp for the most recent block
        web3.web3js.eth.getBlock(recentEvent.block).then(function(recentBlock) {
          var mostRecentBlockTimestamp = recentBlock.timestamp;
          var mostRecentBlockNum = recentBlock.number;

          // get the timestamp for the oldest block
          web3.web3js.eth
            .getBlock(oldestEvent.block)
            .then(function(oldestBlock) {
              var oldestBlockTimestamp = oldestBlock.timestamp;
              var oldestBlockNum = oldestBlock.number;

              var blockBounds = mostRecentBlockNum - oldestBlockNum;
              var timestampBoundsInSeconds =
                mostRecentBlockTimestamp - oldestBlockTimestamp;

              // now we have our bounds. determine a timestamp for each of the block numbers in the event list
              eventList.forEach(e => {
                var blockRatio = (e.block - oldestBlockNum) / blockBounds;
                var blockTimestampInSeconds =
                  blockRatio * timestampBoundsInSeconds + oldestBlockTimestamp;

                // calculate which date time this block number falls under
                var blockDay = new Date(blockTimestampInSeconds * 1000);

                var dateKey =
                  blockDay.getMonth() +
                  "-" +
                  blockDay.getDate() +
                  "-" +
                  blockDay.getFullYear();

                // console.log(e.block + "  " + oldestBlockNum  + "  " + dateKey + "  " + e.volume);//+ "  "  + mostRecentBlockNum + "   " + blockRatio + "  " + dateKey);

                if (e.volume > 0) {
                  if (!(dateKey in dateKeyToVolumeMap)) {
                    dateKeyToVolumeMap[dateKey] = 0;
                  }

                  dateKeyToVolumeMap[dateKey] += e.volume;
                }
              });

              volumeDataMap = dateKeyToVolumeMap;
              didReceiveData = true;

              app.setState({});
            });
        });
      } else {
        didReceiveData = true;

        app.setState({});
      }
    });
  });
};

export default App;
