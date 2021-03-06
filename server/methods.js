function addCardsToPlayer(gameId, ownerId, color, handCardsNumber, manaPoolCardsNumber) {
    let deck = MeteorApp.Decks.findOne(ownerId);
    var allCards = deck.cards.map(
        (cardId) => MeteorApp.Cards.findOne(cardId)
    );
    
    allCards = lodash.shuffle(allCards);
    
    // Те каты которые мы добавляем как изначальные(герои и арии)
    var initialHandCards = deck.handCards.map(
        (cardId) => MeteorApp.Cards.findOne(cardId)
    );
    

    var handCards = lodash.take(allCards, handCardsNumber);
    var deckCards = lodash.drop(allCards, handCardsNumber);
    var manaPoolCards = [];
    
    // Переносим карты из деки в манапул
    for(var i = 0; i < manaPoolCardsNumber; i++) {
        manaPoolCards.push(deckCards.pop());
    }
    
    //initial cards from handCards
    initialHandCards.forEach(
        (card) => Meteor.call('createCardFromData', gameId, card, ownerId, 'hand', color)
    );

    //hand creatures
    handCards.forEach(
        (card) => Meteor.call('createCardFromData', gameId, card, ownerId, 'hand', color)
    );

    //deck
    deckCards.forEach(
        (card) => Meteor.call('createCardFromData', gameId, card, ownerId, 'deck', color)
    );
    
    //deck
    manaPoolCards.forEach(
        (card) => Meteor.call('createCardFromData', gameId, card, ownerId, 'manaPool', color)
    );
}


Meteor.methods({
    removeGameById: function(gameId) {
        MeteorApp.Games.remove(gameId);
        MeteorApp.CardsInGame.remove({gameId: gameId});
        MeteorApp.Actions.remove({});
    },


    startGame: function(game) {
        addCardsToPlayer(game._id, game.playerId1, '1', 8, 0);
        addCardsToPlayer(game._id, game.playerId2, '2', 8, 1);

        if (game.type == 'ogre') {
            addCardsToPlayer(game._id, game.playerId3, '3', 8, 0);
            addCardsToPlayer(game._id, game.playerId4, '4', 8, 1);
        }
    },


    createCardFromData: function(gameId, cardData, ownerId, cardGroup, color) {
        delete cardData._id;
        cardData.gameId = gameId;
        cardData.ownerId = ownerId;
        cardData.cardGroup = cardGroup;
        cardData.color = color;

        cardData.counter = cardData.counter || 0;
        cardData.attachable = _.contains(['spell', 'area'], cardData.type);
        cardData.maxHealth = cardData.health;
        cardData.attachedCards = [];
        //cardData.rotated = false;

        if (cardGroup == 'manaPool') {
            cardData.tapped = false;
        }

        return MeteorApp.CardsInGame.insert(cardData);
    },


    createCardInPlayerHand: function(gameId, ownerId, cardId) {
        var card = MeteorApp.Cards.findOne(cardId);
        var color = MeteorApp.CardsInGame.findOne({gameId: gameId, ownerId: ownerId}).color;

        var newCardInGameId = Meteor.call('createCardFromData', gameId, card, ownerId, 'hand', color);
        var newCardInGame = MeteorApp.CardsInGame.findOne(newCardInGameId);

        newCardInGame.id = newCardInGame._id;

        MeteorApp.Actions.insert({
            gameId: gameId,
            type: 'Backend:cardCreated',
            params: {
                card: newCardInGame
            }
        });
    }
});
