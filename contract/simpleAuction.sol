//SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;


interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Auctions{

    //Variables
    address internal contractOwner;
    uint256 internal amount;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    uint index = 0;
    
    //uint auctionStartTime = 86400; //actual setting  "A day"
    
    uint auctionStartTime = 300; //for testing '5 mins'
    
    //uint completionDeadline = 604800; //actual setting "7 days"
    
    uint completionDeadline = 600; // for testing '10 mins' to complete transaction between the beneficiary and the hghestbidder
    
    uint Tax;

    enum State { // Handles the final transaction between the highestBidder and beneficiary after the auction has ended
        NOT_INITIATED,
        AWAITING_DELIVERY,
        ITEM_SENT,
        DELIVERY_COMPLETE,
        COMPLETE,
        AUCTION_CANCELED
    }
    
    struct Image {
        string firstImage;
        string secondImage;
        string thirdImage;
    }
    
    struct Auction {
        address payable beneficiary;
        string itemName;
        string itemDescription;
        uint auctionStartTime;
        uint auctionEndTime;
        uint auctionDeadline;
        uint startPrice;
        uint biddingFee;
        uint auctionTax;
        address highestBidder;
        uint highestBid;
        uint noOfBids;
        bool auctionEnded;
        bool auctionSettled;
        bool highestBidTransferred;
        bool itemSent;
        bool deliveryComplete;
        bool isSellerDone;
        bool isBuyerDone;
        State auctionState; //to handle payment between the highestBidder and the Beneficiary

        mapping (uint => Image) images;
        mapping (address => bool) hasPaidBidFee;
        mapping (address => bool) hasPlacedBid;
        mapping (address => bool) hasPaidTax;
    }

    mapping(uint => Auction) internal auctions;


    modifier onlyAfter(uint _time){
        // i.e function can only be activated after the time runs out
        require(block.timestamp > _time,"This action cannot be performed now");
        _;
    }
    
    modifier onlyHighestbidder(uint _index) {
        require(msg.sender == auctions[_index].highestBidder, "Sorry you are not the highest bidder");
        _;
    }
    
    modifier hasPaidBidFee(uint _index){
        require(auctions[_index].hasPaidBidFee[msg.sender] == true, "You have not paid bidding fee");
        _;
    }

    modifier hasPaidTax(uint _index){
        require(auctions[_index].hasPaidTax[msg.sender] == true, "You have not paid Tax");
        _;
    }

    modifier onlyAuctionOwner(uint _index){
        require(msg.sender == auctions[_index].beneficiary, "You are not the beneficiary of this auction");
        _;
    }
    
    modifier checkAuctionState(uint _index, State _auctionstate){
        require(auctions[_index].auctionState == _auctionstate);
        _;
    }
    


    //Constructor
    constructor(){
        contractOwner = msg.sender;
    }

    //Functions

    function createAuction(
        string memory _itemName,
        string memory _itemDescription,
        Image memory _itemImages,
        uint _endTime,
        uint _startPrice
        )public {
            Auction storage _auction = auctions[index];
            _auction.beneficiary = payable(msg.sender);
            _auction.itemName = _itemName;
            _auction.images[index] = _itemImages;
            _auction.itemDescription = _itemDescription;
            _auction.auctionStartTime = block.timestamp + auctionStartTime;
            _auction.auctionEndTime = _auction.auctionStartTime + _endTime;
            _auction.auctionDeadline = _auction.auctionEndTime + completionDeadline;
            _auction.startPrice = _startPrice;
            _auction.biddingFee = (_startPrice)/10;
            _auction.highestBid = _auction.startPrice;
            _auction.auctionTax = 0;
            _auction.noOfBids = 0;
            _auction.auctionState = State.NOT_INITIATED;
            index++;
    }

    function getAuction(uint _index) public view returns(
        address payable,
        string memory,
        string memory,
        uint,
        uint
    ) {
        uint endTime;
        if(block.timestamp > auctions[_index].auctionEndTime){
            endTime = 0;           
        } else{
            endTime = auctions[_index].auctionEndTime - block.timestamp;  
        }
        return(
            auctions[_index].beneficiary,
            auctions[_index].itemName,
            auctions[_index].itemDescription,
            endTime,
            auctions[_index].auctionTax
        );
    }
    
    function getImageLinks(uint _index) public view returns(
        string memory, 
        string memory, 
        string memory
        ){
            return(
            auctions[_index].images[_index].firstImage,
            auctions[_index].images[_index].secondImage,
            auctions[_index].images[_index].thirdImage
       );
    }
    
    function getPricing(uint _index) public view returns(
        uint, 
        uint
    ){  
        return(
            auctions[_index].startPrice,
            auctions[_index].biddingFee
        );
    }
    
    function payBidFee(uint _index) public payable{
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), auctions[_index].biddingFee),
                "Transfer failed"
        );
        auctions[_index].hasPaidBidFee[msg.sender] = true;
    }

    function withdrawBidFee(uint _index) public onlyAfter(auctions[_index].auctionEndTime) hasPaidBidFee(_index){ 
        if (msg.sender == auctions[_index].highestBidder){
            require(auctions[_index].auctionState == State.DELIVERY_COMPLETE, "You cannot withdraw Bid Fee until you have settled the auction.");
            amount = auctions[_index].biddingFee;
            IERC20Token(cUsdTokenAddress).transfer(msg.sender, amount);
            auctions[_index].hasPaidBidFee[msg.sender] = false;
            auctions[_index].isBuyerDone = true;
        }else{
            amount = auctions[_index].biddingFee;
            IERC20Token(cUsdTokenAddress).transfer(msg.sender, amount);
            auctions[_index].hasPaidBidFee[msg.sender] = false;
        }
        
    }

    function placeBid(uint _index, uint bidAmount) public onlyAfter(auctions[_index].auctionStartTime) hasPaidBidFee(_index){
        if (block.timestamp > auctions[_index].auctionEndTime) {
            revert("The auction has already ended");
        }

        if (bidAmount <= auctions[_index].highestBid){
            revert("There is already a higher or equal bid");
        }

        auctions[_index].highestBidder = msg.sender;
        auctions[_index].highestBid = bidAmount;
        auctions[_index].auctionTax =  (auctions[_index].highestBid)/10;

        auctions[_index].noOfBids++;
        auctions[_index].hasPlacedBid[msg.sender] = true;
    }

    function settleAuction(uint _index) onlyAfter(auctions[_index].auctionEndTime) onlyHighestbidder(_index) public payable {
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), auctions[_index].highestBid),
                "Transfer failed"
        );

        auctions[_index].highestBidTransferred= true;
        auctions[_index].auctionState = State.AWAITING_DELIVERY;
    }
    
    function sendItem(uint _index) onlyAfter(auctions[_index].auctionEndTime) onlyAuctionOwner(_index) checkAuctionState(_index, State.AWAITING_DELIVERY) public{
        require (
            IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), auctions[_index].auctionTax), "Transfer failed"
            );
        
        // AuctionOwner Now pays a tax so he does not claim to have sent the item without having sent the item
        auctions[_index].itemSent = true;
        auctions[_index].auctionState = State.ITEM_SENT;
        auctions[_index].hasPaidTax[msg.sender] = true;
    }

    function confirmReceipt(uint _index) onlyAfter(auctions[_index].auctionEndTime) onlyHighestbidder(_index) checkAuctionState(_index, State.ITEM_SENT) public {
        require(
            IERC20Token(cUsdTokenAddress).transfer(auctions[_index].beneficiary, auctions[_index].highestBid), "Transfer Failed"
        );
        auctions[_index].auctionState = State.DELIVERY_COMPLETE;
        auctions[_index].deliveryComplete = true;
    }
    
    function withdrawTax(uint _index) onlyAfter(auctions[_index].auctionEndTime) onlyAuctionOwner(_index) hasPaidTax(_index) checkAuctionState(_index, State.DELIVERY_COMPLETE) public{
        require(
            IERC20Token(cUsdTokenAddress).transfer(auctions[_index].beneficiary, auctions[_index].auctionTax), "Transfer Failed"
        );
        auctions[_index].hasPaidTax[msg.sender] = false;
        auctions[_index].isSellerDone = true;
        
    }
    
    function cancelAuctionHighestBidder(uint _index) onlyAfter(auctions[_index].auctionDeadline) onlyHighestbidder(_index) checkAuctionState(_index, State.AWAITING_DELIVERY) public {
        require(
            IERC20Token(cUsdTokenAddress).transfer(payable(msg.sender), auctions[_index].highestBid), "Transfer Failed"
        );
        
        auctions[_index].auctionState = State.AUCTION_CANCELED;
        auctions[_index].auctionSettled = true;
    }
    
    function cancelAuction(uint _index) onlyAfter(auctions[_index].auctionDeadline) onlyAuctionOwner(_index) public{
        require(
            auctions[_index].noOfBids != 0 && auctions[_index].auctionState == State.NOT_INITIATED, "Sorry but you do not meet the requirements to use this feature"
        );
        
        amount = auctions[_index].biddingFee;
        IERC20Token(cUsdTokenAddress).transfer(msg.sender, amount);
        auctions[_index].hasPaidBidFee[auctions[_index].highestBidder] = false;
        auctions[_index].auctionState = State.AUCTION_CANCELED;
        auctions[_index].auctionSettled = true;
    }
    
    
    function getAuctionsLength() public view returns(uint){
        return (index);
    }

    function hasAuctionStarted(uint _index) public view returns(bool, uint){
        uint remainingTime = 0; 
        if(block.timestamp > auctions[_index].auctionStartTime){
            return (true, remainingTime);
        }else{
            remainingTime = auctions[_index].auctionStartTime - block.timestamp;
            return (false, remainingTime);
        }
    }

    function _hasPaidBidFee(uint _index) public view returns(bool){
        return(
             auctions[_index].hasPaidBidFee[msg.sender]
        );
    }

    function getBidDetails(uint _index) public view returns(address, uint){
        return(
            auctions[_index].highestBidder,
            auctions[_index].highestBid
        );
    }

    function hasAuctionEnded(uint _index) public view returns(bool){
        if(block.timestamp > auctions[_index].auctionEndTime){
            return(true);
        }else{
            return (false);
        }
    }

    function hasPlacedBid(uint _index) public view returns(bool){
        return (
            auctions[_index].hasPlacedBid[msg.sender]
        );
    }
    
    function noOfBids(uint _index) public view returns(uint){
        return(auctions[_index].noOfBids);
    }
    
    function isAuctionSettled(uint _index) public view returns(bool){
        if(auctions[_index].auctionSettled || (auctions[_index].isSellerDone && auctions[_index].isBuyerDone)){
        return(true);  
        }else{
            return(false);
        }

    }
    
    function hasMadePayment(uint _index) public view returns(bool){
        return(
            auctions[_index].highestBidTransferred    
        );
    }
    function deliveryComplete(uint _index) public view returns(bool){
        return(
            auctions[_index].deliveryComplete
        );
    }
    function hasSentItem(uint _index) public view returns(bool){
        return(
            auctions[_index].itemSent    
        );
    }

    function _hasPaidTax(uint _index) public view returns(bool){
        return(
            auctions[_index].hasPaidTax[msg.sender]
        );
    }

    function hasPassedDeadline(uint _index) public view returns(bool){  
        if(block.timestamp > auctions[_index].auctionDeadline && !auctions[_index].auctionSettled){
            return(true);
        }else{
            return(false);
        }
    }
    
}