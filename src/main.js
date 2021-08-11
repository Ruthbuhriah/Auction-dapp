import Web3 from 'web3'
import {
  newKitFromWeb3
} from '@celo/contractkit'
import BigNumber from "bignumber.js"
import auctionAbi from '../contract/auction.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const AuctionContractAddress = "0xBdC9EC27463668dE843B1f1D1D49F1Dd21309102"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"


let contract
let kit
let recentAuctions
let currentAuctionID
let auctions = []
let activeListings = []
let closedListings = []
let isShown


//Celo Blockchain Functions
const connectCeloWallet = async function() {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.")
    try {
      await window.celo.enable()
      notificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(auctionAbi, AuctionContractAddress)

    } catch (error) {
    return  notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(AuctionContractAddress, _price)
    .send({
      from: kit.defaultAccount
    })
  return result
}


const getBalance = async function() {
  notification("⌛ Loading...")
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

const setUser = async function() {
  notification("⌛ Loading...")
  document.getElementById("userAddr").innerHTML = ""
  const newDiv = document.createElement("div")
  newDiv.innerHTML = renderUserIcon(kit.defaultAccount)
  document.getElementById("userAddr").appendChild(newDiv)
}

const auctionNotifications = async function() {
  processNotifications(auctions);
}

const getAuctions = async function() {
  notification("⌛ Loading...")
  const _auctionsLength = await contract.methods.getAuctionsLength().call()
  const _auctions = []
  for (let i = 0; i < _auctionsLength; i++) {
    let _auction = new Promise(async (resolve, reject) => {
      let o = await contract.methods.getAuction(i).call()
      let p = await contract.methods.getImageLinks(i).call()
      let q = await contract.methods.getPricing(i).call()
      let r = await contract.methods.hasAuctionStarted(i).call()
      let s = await contract.methods._hasPaidBidFee(i).call()
      let t = await contract.methods.getBidDetails(i).call()
      let u = await contract.methods.hasAuctionEnded(i).call()
      let v = await contract.methods.hasPlacedBid(i).call()
      let w = await contract.methods.noOfBids(i).call()
      let x = await contract.methods.isAuctionSettled(i).call()
      let y = await contract.methods.hasMadePayment(i).call()
      let z = await contract.methods.hasSentItem(i).call()
      let a = await contract.methods.hasPassedDeadline(i).call()
      let b = await contract.methods.deliveryComplete(i).call()
      let c = await contract.methods._hasPaidTax(i).call()
      resolve({
        index: i,
        owner: o[0],
        itemName: o[1],
        itemDescription: o[2],
        endTime: o[3],
        auctionTax: new BigNumber(o[4]),
        image1: p[0],
        image2: p[1],
        image3: p[2],
        startPrice: new BigNumber(q[0]),
        biddingFee: new BigNumber(q[1]),
        hasAuctionStarted: r[0],
        remainingTimeTillStart: r[1],
        hasPaidBidFee: s,
        highestBidder: t[0],
        highestBid: new BigNumber(t[1]),
        hasAuctionEnded: u,
        hasPlacedBid: v,
        noOfBids: w,
        isAuctionSettled: x,
        hasMadePayment: y,
        hasSentItem: z,
        deadlinePassed: a,
        delivered: b,
        paidTax: c,
      })
    })
    _auctions.push(_auction)

  }
  auctions = await Promise.all(_auctions)
  sortListings()
  setUserID()
  renderTitle("Recent Auctions")
  getRecent()
  renderAuctions(recentAuctions)
  notificationOff()
}



// Created Functions
function setUserID() {
  auctions.forEach((_auction) => {
    if (kit.defaultAccount == _auction.owner) {
      _auction["isUserOwner"] = true;
    } else {
      _auction["isUserOwner"] = false;
    }
    if (_auction.hasAuctionEnded && kit.defaultAccount == _auction.highestBidder) {
      _auction["isUserWinner"] = true;
    } else {
      _auction["isUserWinner"] = false;
    }
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
/*Processing Function*/
async function notificationDisplay(_auction){
  if(_auction.hasAuctionEnded){
    if (_auction.hasPlacedBid && !_auction.isUserWinner) {
      await delay(3000);
      notificationOff()
      await delay(500);
      notification(`${_auction.itemName} listing has ended.`)
    }

    if (_auction.isUserWinner) {
      if(!_auction.delivered &&  !_auction.hasSentItem  && !_auction.hasMadePayment){
        await delay(3000);
        notificationOff()
        await delay(500);
        notification(`🎉 Congratulations you won the auction of ${_auction.itemName}.`)
      }else if(!_auction.delivered &&  _auction.hasSentItem  && !_auction.hasMadePayment){
        await delay(3000);
        notificationOff()
        await delay(500);
        setTimeout(notification(`Seller has sent item ${_auction.itemName}.`), 10000)
      }else if(!_auction.delivered && _auction.hasMadePayment){
        await delay(3000);
        notificationOff()
        await delay(500);
        setTimeout(notification(`Waiting for Seller to send ${_auction.itemName} item. ${_auction.itemName}.`), 10000)
      }else if(_auction.hasPaidBidFee &&_auction.delivered){
        await delay(3000);
        notificationOff()
        await delay(500);
        setTimeout(notification(`Your Order for ${_auction.itemName} is now complete.`), 10000)
      }else{
        notification("Done")
      }
    }

    if (_auction.isUserOwner) {
      if(!_auction.delivered && !_auction.hasMadePayment && !_auction.hasSentItem && !(_auction.noOfBids == 0)){
        await delay(3000);
        notificationOff()
        await delay(500);
        notification(`Your ${_auction.itemName} listing has ended.`)
      }else if(!_auction.delivered && _auction.hasMadePayment && !_auction.hasSentItem){
        await delay(3000);
        notificationOff()
        await delay(500);
        notification(`Buyer has completed payment for item ${_auction.itemName}.`)
      }else if(!_auction.delivered && _auction.hasSentItem){
        await delay(3000);
        notificationOff()
        await delay(500);
        notification(`Waiting for receipt confirmation from buyer for the ${_auction.itemName} item`)
      }else if(_auction._hasPaidTax && _auction.delivered){
        await delay(3000);
        notificationOff()
        await delay(500);
        notification(`Buyer has received successfully received item, check your balance to see if you have received your money.`)
      }else{
        notification("Done")
      }
    }
  }else {
    if (_auction.hasPlacedBid && kit.defaultAccount != _auction.highestBidder) {
      await delay(2000);
      notificationOff()
      await delay(500);
      notification(`Your Bid for ${_auction.itemName} has been outbid.`)
    }
  }
}

/* Waiting in the loop */
async function processNotifications(array) {
  array.forEach(async (_auction) => {
    await notificationDisplay(_auction);
  })
}


function sortListings() {
  auctions.forEach((_auction) => {
    if (_auction.hasAuctionEnded) {
      closedListings.push(_auction)
    } else {
      activeListings.push(_auction)
    }
  })
}

function notification(_text) {
  document.querySelector("#notification").textContent = _text
  $('._alert').addClass("show");
  $('._alert').removeClass("hide");
  $('._alert').addClass("showAlert");
}

function notificationOff() {
  $('._alert').removeClass("show");
  $('._alert').addClass("hide");
}


function getRecent() {
  let dummy = [...activeListings];
  dummy.push("");
  recentAuctions = dummy.slice(-4, -1);
}

function renderAuctions(_auctions) {
  notification("⌛ Loading...")
  document.getElementById("gallery").innerHTML = ""
  _auctions.forEach((_auction) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = auctionTemplate(_auction)
    document.getElementById("gallery").appendChild(newDiv)
  })
}

function renderTitle(_text){
  document.getElementById("_header").innerHTML = ""
  document.getElementById("_header").innerHTML = _text
}

function checkTime(_auction) {
  var endingTime = _auction.endTime;
  var remainingTime = _auction.remainingTimeTillStart;

  if (endingTime == 0){
    return `
    <span> Time Left: Listing has Ended</span>
    `
  }

  if (_auction.hasAuctionStarted) {
    var seconds = parseInt(endingTime, 10);
    var days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    var hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    var mins = Math.floor(seconds / 60);
    seconds -= mins * 60;
    if(hrs == 0 && mins != 0){
      return `
    <span> Auction Ends in ${mins}m </span>
    `
    }else if(hrs == 0 && mins == 0){
      return `
      <span> Auction Ends in ${seconds}s </span>
    `
    }else {
      return `
    <span> Auction Ends in ${days}d ${hrs}h ${mins}m</span>
    `
    }
  } else {
    var seconds = parseInt(remainingTime, 10);
    var days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    var hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    var mins = Math.floor(seconds / 60);
    seconds -= mins * 60;
    if(hrs == 0 && mins != 0){
      return `
    <span> Auction starts in ${mins}m </span>
    `
    }else if(hrs == 0 && mins == 0){
      return `
      <span> Auction starts in ${seconds}s </span>
    `
    }else {
      return `
    <span> Auction Starts in ${hrs}h ${mins}m</span>
    `
    }
    
  }

}

function convertDays(_days) {
  var seconds = Math.floor(_days * 24 * 3600);
  return seconds;
}

function auctionTemplate(_auction) {
  return `
  <div class="card mb-4">
  <div style="height: 23.6vw; display:flex; vertical-align: middle !important;"> 
  <img class="card-img-top" src="${_auction.image1}" alt="...">
  </div>
  <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
  <i class="fas fa-gavel"></i>&nbsp;${_auction.noOfBids} Bids
  </div>
  <div class="card-body text-left p-4 position-relative">
    <div class="translate-middle-y position-absolute top-0">
    ${identiconTemplate(_auction.owner)}
    </div>
    <h6 class="card-title fs-4 fw-bold mt-2" style=" font-size: 20px !important; min-height: 90px; text-transform:uppercase;">
    ${_auction.itemName}
    </h6>
    <h3 class="card-text mt-4">
      ${_auction.highestBid.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD 
    </h3>
    <p class="card-text mt-4">
    <i class="fas fa-hourglass-half"></i>&nbsp;
      ${checkTime(_auction)}
    </p>
    <div class="d-grid gap-2">
      <a class="btn btn-lg btn-outline-dark viewAuction fs-6 p-3" id=${
        _auction.index
      }>
       View Auction
      </a>
    </div>
  </div>
</div>

  `
}

function renderAuctionModal(index) {
  notification("⌛ Loading...")
  document.getElementById("auctionDisplay").innerHTML = ""
  const newDiv = document.createElement("div")
  newDiv.className = "modal-content"
  newDiv.innerHTML = auctionModalTemplate(auctions[index])
  document.getElementById("auctionDisplay").appendChild(newDiv)
  editAuctionModal(auctions[index])
  $("#auctionModal").modal('show');
  notificationOff()
}


function editAuctionModal(_auction) {
  if(_auction.deadlinePassed){
    document.getElementById("cancelBtn").disabled = false;
    document.getElementById("refundBtn").disabled = false;
  }
  if (!_auction.hasAuctionStarted) {
    $("#auctionBtns").addClass('is-hidden')
    $("#buyersBtn").addClass('is-hidden')
    $("#sellersBtn").addClass('is-hidden')
    return;
  }

  if(_auction.isAuctionSettled){
    $("#auctionBtns").addClass('is-hidden')
    $("#buyersBtn").addClass('is-hidden')
    $("#sellersBtn").addClass('is-hidden')
    return;
  }
  if (_auction.hasAuctionEnded){
    if (!_auction.hasPaidBidFee &&_auction.noOfBids == 0){
      $("#auctionBtns").addClass('is-hidden')
      $("#buyersBtn").addClass('is-hidden')
      $("#sellersBtn").addClass('is-hidden')
      return;
    }
    if(_auction.isUserWinner) {
      if(!_auction.hasPaidBidFee){
        $("#withdrawBtn").addClass('is-hidden')
        $("#cancelAuctionBuyer").addClass('is-hidden')
      }
      if(_auction.hasMadePayment){
        $('#settleBtn').addClass('is-hidden')
      }else{
        $('#confirmBtn').addClass('is-hidden')
        $("#cancelAuctionBuyer").addClass('is-hidden')
      }
      if(_auction.delivered){
        document.getElementById("withdrawBtn").disabled = false;
        $("#cancelAuctionBuyer").addClass('is-hidden')
        $('#confirmBtn').addClass('is-hidden')
        $('#settleBtn').addClass('is-hidden')
      }
      $("#bid").addClass('is-hidden')
      $(".payBidBtn").addClass('is-hidden')
      $("#sellersBtn").addClass('is-hidden')
      return;
    }
    if(!_auction.isUserOwner){
      if(!_auction.hasPaidBidFee){
        $("#withdrawBtn").addClass('is-hidden')
      }
      document.getElementById("withdrawBtn").disabled = false;
      $("#bid").addClass('is-hidden')
      $(".payBidBtn").addClass('is-hidden')
      $("#buyersBtn").addClass('is-hidden')
      $("#sellersBtn").addClass('is-hidden')
      return; 
    }
  }
  if(_auction.isUserOwner){
    if(!_auction.hasMadePayment){
      document.getElementById("sendItemBtn").disabled = true;
    }else{
      document.getElementById("cancelBtn").disabled = true;
    }
    if(_auction.hasSentItem){
      document.getElementById("sendItemBtn").disabled = true;
    }else{
      document.getElementById("withdraw").disabled = true;
    }   
    if(!_auction.paidTax){
      document.getElementById("withdraw").disabled = true;
    }
    $("#auctionBtns").addClass('is-hidden')
    $("#buyersBtn").addClass('is-hidden')
    return;
  }
  if (_auction.hasPaidBidFee){
    if(!_auction.hasAuctionEnded){
      if(kit.defaultAccount == _auction.highestBidder){
        $("#highestBidder").removeClass('is-hidden')
      }else{
        $("#notHighestBidder").removeClass('is-hidden')
      }
    }
    $(".payBidBtn").addClass('is-hidden')
    $("#buyersBtn").addClass('is-hidden')
    $("#sellersBtn").addClass('is-hidden')
  } else {
    $("#bid").addClass('is-hidden')
    $("#withdrawBtn").addClass('is-hidden')
    $("#buyersBtn").addClass('is-hidden')
    $("#sellersBtn").addClass('is-hidden')
  }
}




function auctionModalTemplate(_auction) {
  return `
<div class="modal-content" style="background-color: rgb(171, 161, 163);">
  <div class="modal-header">
    <div class="modal-title" id="auctionTitle">
      <span class="navbar-brand mb-0 h1"> <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Crossed_Gavels.svg/200px-Crossed_Gavels.svg.png" height="30" alt="" loading="lazy" style="margin-top: -1px;" />BID-WAR</span>
    </div>
    <button type="button" class="btn-close closeModal" data-bs-dismiss="modal" aria-label="Close"></button>
  </div>
  <div class="modal-body" style="background-color: rgb(171, 161, 163);">
    <div class="flex_container">
      <div class="flex_row">
        <div id="carouselExampleIndicators" class="carousel slide" data-mdb-ride="carousel">
          <div class="carousel-indicators">
            <button type="button" data-mdb-target="#carouselExampleIndicators" data-mdb-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
            <button type="button" data-mdb-target="#carouselExampleIndicators" data-mdb-slide-to="1" aria-label="Slide 2"></button>
            <button type="button" data-mdb-target="#carouselExampleIndicators" data-mdb-slide-to="2" aria-label="Slide 3"></button>
          </div>
          <div class="carousel-inner">
            <div class="carousel-item _image-slide active">
              <img style='height: 100%; width: 100%; object-fit: contain' src="${_auction.image1}" class="d-block w-100" alt="..." >
            </div>
            <div class="carousel-item _image-slide">
              <img style='height: 100%; width: 100%; object-fit: contain' src="${_auction.image2}" class="d-block w-100" alt="..." >
            </div>
            <div class="carousel-item _image-slide">
              <img style='height: 100%; width: 100%; object-fit: contain' src="${_auction.image3}" class="d-block w-100" alt="..." >
            </div>
          </div>
          <button class="carousel-control-prev" type="button" data-mdb-target="#carouselExampleIndicators" data-mdb-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
          </button>
          <button class="carousel-control-next" type="button" data-mdb-target="#carouselExampleIndicators" data-mdb-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
          </button>
        </div>
      </div>
      <div class="flex_row">
        <div>
        <h6 class="card-title fs-4 fw-bold mt-2" style=" font-size: 25px !important; min-height: 60px; text-transform:uppercase;">
        ${_auction.itemName}
        </h6>
        </div>
        <hr>
        <div id="time">
          &emsp;&emsp;${checkTime(_auction)}
        </div>
        <hr>
        <div>
          <p>&emsp;&emsp;Start Price:&ensp; ${_auction.startPrice.shiftedBy(-ERC20_DECIMALS).toFixed(2)} &nbsp;cUSD</p>
          <p>&emsp;&emsp;Highest Bid:&ensp;${_auction.highestBid.shiftedBy(-ERC20_DECIMALS).toFixed(2)}&nbsp;cUSD</p>
          <p>&emsp;&emsp;No of Bids:&ensp;${_auction.noOfBids}&nbsp;<i class="fas fa-gavel"></i></p> 
          <p id="highestBidder" class="is-hidden">&emsp;&emsp;You are the highest bidder</p>
          <p id="notHighestBidder" class="is-hidden">&emsp;&emsp;You are not the highest bidder</p> 
        </div>
        <hr>
        <div id="auctionBtns">
          <div id="bid">
            &emsp;&emsp;<input id="bidAmount" type="text" size="9" required>&nbsp;cUSD&nbsp;&emsp;&emsp;<button type="button" class="btn btn-dark placeBid">Place bid</button><br>
          </div>
          <div>
            <p>&emsp;&emsp;Bid Fee: 10% of starting bid price</p>
            &emsp;&emsp;<button type="button" id="payBidBtn" class="btn btn-dark payBidBtn">
            Pay Bid Fee
            </button>
            <button type="button" id="withdrawBtn" class="btn btn-dark withdrawBidFee" disabled>
              Withdraw Bid Fee
            </button>
          </div>
        </div>
        <div id="buyersBtn">
          <blockquote>&emsp;&emsp;N/B: You can only withdraw after settling bid</blockquote>
          <div id="settleBtn">
          <p>&emsp;&emsp;Transfer funds to Beneficiary.</p>
          &emsp;&emsp;<button type="button" i class="btn btn-dark settleBtn">
            Transfer Funds</button>
          </div>
          <div id="confirmBtn">
            <p>&emsp;&emsp;Please confirm if Item has been received by you.</p>
            &emsp;&emsp;<button type="button" i class="btn btn-dark confirmBtn">
              Confirm Item Receipt
            </button>
          </div>
          <div id="cancelAuctionBuyer">
              <hr>
              <p>&emsp;&emsp;Note: This is only functional if seller doesn't release item</p>
              &emsp;&emsp;<button type="button" id="refundBtn" class="btn btn-dark requestRefundBtn" disabled>
                Request Refund
              </button>
      </div>
        </div>
        <div id="sellersBtn">
          &emsp;&emsp;Please confirm if you have released item. <br> 
          &emsp;&emsp;<button  type="button" id="sendItemBtn" class="btn btn-dark sendItemBtn">
            Item has been sent
          </button>
          <blockquote>&emsp;&emsp;N/B: A withdrawable tax (10% of highest bid) will be paid by you as<br>
          &emsp;&emsp;security for buyer.</blockquote>
          &emsp;&emsp;<button type="button" id="withdraw" class="btn btn-dark withdrawTaxBtn">
            Withdraw Tax
          </button>
          <p>&emsp;&emsp;N/B: You can only withdraw after bid is complete</p>
          <div id="cancelAuctionSeller">
            <hr>
            <p>&emsp;&emsp;Note: This is only functional if the Highest Bidder does not make<br>
            &emsp;&emsp;payments</p>
            &emsp;&emsp;<button type="button" id="cancelBtn" class="btn btn-dark cancelBtn" disabled>
              Cancel Auction
            </button>
          </div>
        </div>
      </div>     
    </div>
    <hr>
    <div style="height:300px; background-color:white; overflow:auto">
      <h4 style="padding-top: 20px; padding-left: 20px;">ITEM DETAILS</h4>
      <p style="padding: 20px; margin:auto;">
        ${_auction.itemDescription}
      </p>
    </div>
  </div>
</div>

`
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
    <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
      <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
          target="_blank">
          <img src="${icon}" width="48" alt="${_address}">
      </a>
    </div>
    `
}

function renderUserIcon(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
<div id="userAddr" class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm">
<a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
  target="_blank">
  <img src="${icon}" width="35" alt="${_address}">
</a>
</div>
  `
}

// DOM Queries
$(document).ready(() => {
  $('.close-btn').click(function() {
    notificationOff()
  });
});

document
  .querySelector("#newAuctionBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("itemName").value,
      document.getElementById("item-desc").value,
      [
        document.getElementById("imgUrl1").value,
        document.getElementById("imgUrl2").value,
        document.getElementById("imgUrl3").value,
      ],
      convertDays(document.getElementById("listing-duration").value),
      new BigNumber(document.getElementById("startPrice").value)
      .shiftedBy(ERC20_DECIMALS)
      .toString()
    ]
    notification(`⌛ Adding New Auction...`)
    try {
      const result = await contract.methods
        .createAuction(...params)
        .send({
          from: kit.defaultAccount
        })
    } catch (error) {
    return notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added a new auction.`)
    getAuctions()
    location.reload();
  })

document.querySelector("#gallery").addEventListener("click", async (e) => {
  if (e.target.className.includes("viewAuction")) {
    currentAuctionID = e.target.id
    renderAuctionModal(currentAuctionID)
  }
})

document.querySelector("#activeListings").addEventListener("click", async (e) => {
  notification("⌛ Loading...")
  renderTitle("Active Auctions")
  renderAuctions(activeListings)
  // notification("Complete")
})

document.querySelector("#closedListings").addEventListener("click", async (e) => {
  notification("⌛ Loading...")
  renderTitle("Closed Auctions")
  renderAuctions(closedListings)
  // notification("Complete")
})

document.querySelector("#auctionDisplay").addEventListener("click", async (e) => {
  if (e.target.className.includes("closeModal")) {
    $('#auctionModal').modal('hide');
    }
  
  if (e.target.className.includes("check")) {
    dispFunction()
  }

  // Paying Bid Fee
  if (e.target.className.includes("payBidBtn")) {
    $('#auctionModal').modal('hide');
    const index = currentAuctionID
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(auctions[index].biddingFee)
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment of ${auctions[index].biddingFee.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD for Auction...`)
    try {
      const result4 = await contract.methods
        .payBidFee(index)
        .send({
          from: kit.defaultAccount
        })
      notification(`🎉 You can now bid for "${auctions[index].itemName}".`)
      await delay(3000);
      notificationOff()
      await delay(500);
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    location.reload();
  }

  if (e.target.className.includes("placeBid")) {
    $('#auctionModal').modal('hide');
    let bidAmount = new BigNumber(document.getElementById("bidAmount").value).shiftedBy(ERC20_DECIMALS).toString()
    const index = currentAuctionID
    notification("⌛ Placing your bid...")
    try {
      const result3 = await contract.methods
        .placeBid(index, bidAmount)
        .send({
          from: kit.defaultAccount
        })
      notification(`🎉 You have successfully placed a bid for "${auctions[index].itemName}".`)
      await delay(3000);
      notificationOff()
      await delay(500);
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    location.reload();
  }

  // Withdrawing Bid Fee
  if (e.target.className.includes("withdrawBidFee")) {
    $('#auctionModal').modal('hide');
    const index = currentAuctionID
    notification(`⌛ Withdrawing funds`)
    try {
      const result2 = await contract.methods
        .withdrawBidFee(index)
        .send({
          from: kit.defaultAccount
        })
      notification(`🎉 Withdrawal of Bid Fee ${auctions[index].biddingFee.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD complete.`)
      await delay(3000);
      notificationOff()
      await delay(500);
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    location.reload();
  }

  // Settle Auction
  if (e.target.className.includes("settleBtn")) {
    $('#auctionModal').modal('hide');
    const index = currentAuctionID
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(auctions[index].highestBid)
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${auctions[index].itemName}"...`)
    try {
      const result1 = await contract.methods
        .settleAuction(index)
        .send({
          from: kit.defaultAccount
        })
      notification(`🎉 You successfully bought "${auctions[index].itemName}".`)
      await delay(3000);
      notificationOff()
      await delay(500);
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    location.reload();
  }

  // ItemSent Declaration Button
  if (e.target.className.includes("sendItemBtn")) {
    $('#auctionModal').modal('hide');
    const index = currentAuctionID
    notification(`⌛ Waiting for payment approval for ${auctions[index].auctionTax.shiftedBy(-ERC20_DECIMALS).toFixed(2)}...`)
    try {
      await approve(auctions[index].auctionTax)
    } catch (error) {
     return notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting Refundable Tax Payment for "${auctions[index].itemName}"...`)
    try {
      const result1 = await contract.methods
        .sendItem(index)
        .send({
          from: kit.defaultAccount
        })
      notification(`🎉 Payment sucessful.`)
      await delay(3000);
      notificationOff()
      await delay(500);
    } catch (error) {
    return  notification(`⚠️ ${error}.`)
    }
    location.reload();
  }

    // Confirm Item receipt Button
    if (e.target.className.includes("confirmBtn")) {
      $('#auctionModal').modal('hide');
      const index = currentAuctionID
      notification(`⌛ Sending Item Receipt confirmation "${auctions[index].itemName}"...`)
      try {
        const result1 = await contract.methods
          .confirmReceipt(index)
          .send({
            from: kit.defaultAccount
          })
        notification(`🎉 Confirmation complete.`)
        await delay(3000);
        notificationOff()
        await delay(500);
      } catch (error) {
     return   notification(`⚠️ ${error}.`)
      }
      location.reload();
    }

    // Withdrawing Tax
    if (e.target.className.includes("withdrawTaxBtn")) {
      $('#auctionModal').modal('hide');
      const index = currentAuctionID
      notification(`⌛ Withdrawing Funds"...`)
      try {
        const result1 = await contract.methods
          .withdrawTax(index)
          .send({
            from: kit.defaultAccount
          })
        notification(`🎉 Withdrawal of Auction Tax ${auctions[index].auctionTax.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD complete.`)
        await delay(3000);
        notificationOff()
        await delay(500);
      } catch (error) {
       return notification(`⚠️ ${error}.`)
      }
      location.reload();
    }

    // HighestBid Refund Button
    if (e.target.className.includes("requestRefundBtn")) {
      $('#auctionModal').modal('hide');
      const index = currentAuctionID
      notification(`⌛ Checking for refundability"...`)
      try {
        const result1 = await contract.methods
          .cancelAuctionHighestBidder(index)
          .send({
            from: kit.defaultAccount
          })
        notification(`🎉 Auction has been cancelled, and you have been refunded`)
        await delay(3000);
        notificationOff()
        await delay(500);
      } catch (error) {
      return  notification(`⚠️ ${error}.`)
      }
      location.reload();
    }

    // Cancel Auction Button for Auction Beneficiary 
    if (e.target.className.includes("cancelBtn")) {
      $('#auctionModal').modal('hide');
      const index = currentAuctionID
      notification(`⌛ Canceling Auction"...`)
      try {
        const result1 = await contract.methods
          .cancelAuction(index)
          .send({
            from: kit.defaultAccount
          })
        notification(`🎉 Auction has been cancelled.`)
        await delay(3000);
        notificationOff()
        await delay(500);
      } catch (error) {
      return  notification(`⚠️ ${error}.`)
      }
      location.reload();
    }

})


window.addEventListener('load', async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await setUser()
  await getAuctions()
  await auctionNotifications()
});
