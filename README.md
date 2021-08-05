[AUCTION DAPP](https://ruthbuhriah.github.io/Auction-dapp/)

# Usage
1. Install the [CeloExtensionWallet](https://chrome.google.com/webstore/detail/celoextensionwallet/kkilomkmpmkbdnfelcpgckmpcaemjcdh?hl=en) from the google chrome store.
2. Create a wallet.
3. Go to [https://celo.org/developers/faucet](https://celo.org/developers/faucet) and get tokens for the alfajores testnet.
4. Switch to the alfajores testnet in the CeloExtensionWallet.

# Install

```

npm install

```

or 

```

yarn install

```

# Start

```

npm run dev

```

# Build

```

npm run build

```


# Auction-dapp
Auction-dapp Built on the celo Network
----------------------------------------------------------------------------
This is an implementation of course celo 101 on Dacade.org.
The application represents a real world auctioning environment. The Dapp has a wide number of functionalities. 
1. The Auction process itself.
2. The Escrow process.

The auction process as the name of the application describes is a bidding war, where users place bids in order to win an item. 
- In order to ensure that the Bidders are going to stay true to their bids, a certain fee called the BIDDING FEE (10% of the start bid price) will be paid before   they can pertake in the auction. This fee is only withdrawable after the auction ends for non-winners and for the winners is withdrawable after the auction has   been completed.
- The bids are placed by declaration, there will be no need to transfer any money when placing bids. The payment is only made after the auction ends and the         payment is made by the auction Winner.

After the auction process is completed, and the Highest Bidder is declared the winner, the Dapp goes into an escrow mode, which handles the payment of the highest Bid to the beneficiary, this payment is dependent on the confirmation of the item reciept by the winner. 

Here is the basic workflow:
- Bid ends, Highest Bidder is confirmed winner and the beneficiary is notified that his/her auction has ended. 
- Winner now has to transfer the Prize money to the contract, which holds it while awaiting confirmation of item receival from the Winner, afterwhich it sends the   prize money to the Beneficiary.
- After the Winner has made payments, the Beneficiary is then notified of this and can then send a confirmation stating that the item has been sent to the Winner,   Now in order to ensure that the Beneficiary cannot make false claims, a certain fee is now paid by the Beneficiary to ensure that he stays truthful, this fee is   the TAX FEE, which is withdrawable after the item is term as delivered by the auction Winner. (Tax Fee = 10% of winning Bid)
- Now after the Beneficiary has paid the Tax, the auction Winner is notified that the Beneficiary has sent the items, So on receiving the items, the Winner can     then confirm the receipt of this item and tag it as delivered, which triggers the Winning Bid Prize money to be send to the Beneficiary. The winner can then go   on to withdraw the earlier Bidding Fee paid to join the auction, and the auction is completed on the Winner's End.
- After the item has been marked as delivered, the Beneficiary receives the Prize money, directly to his balance, and can proceed to withdraw the Tax he had paid   to confirm that he had sent the item, and the auction is completed on the Beneficiary's End.

Note: There are caveats that have been put in place if either the auction Winner (Buyer) or Beneficiary (Seller) do not perform their due tasks. There is a deadline for every auction after the auction ends, for which the Winner and Beneficiary have time to complete the auction. If the deadline is exceeded and the auction is not yet complete, Options for refunding and cancellation of the auction are made available to both users.
- if after the deadline, the Winner has not transferred the winning bid amount to the contract, he stands the chance of loosing the Bid Fee paid to enter the       auction. This can only be activated by the beneficiary, which in turn cancels the auction and renders it as settled.
- But if the Winner has transferred the money, and the Beneficiary does not send the items (pay the tax, to show that he has sent the Items), the winner is able     to request for a refund, which in turn cancels the auction and renders it as settled.
- The only impasse, is if the auction Winner has sent the money, and the Beneficiary has also  sent the items, then none of them can call for the auction to end.

So there are two ways the auction can be settled
- Going through the normal ideal setting, Winner receives item and Beneficiary gets paid.
- If either of the users cancel the auction.
------------------------------------------------------------------------------------------------------------------------------------------------------------------

