// Set up paper.js on the canvas
var canvas = document.getElementById('container');
paper.setup(canvas);


var CENTER_POSITION = canvas.width/2;


var CARD_BACKGROUND_COLOR = 'lightblue';
var CARD_WRITING_COLOR = 'black';

var CARD_HEIGHT = 100;
var CARD_WIDTH = 100;
var CARD_PADDING = 10;
var CARD_FONT_SIZE = 14;
var CARD_TEXT_LENGTH = CARD_WIDTH - CARD_PADDING * 2;

var CARD_MAX_X = canvas.width;
var CARD_MIN_X = 0
var CARD_MAX_Y = canvas.height;
var CARD_MIN_Y = 100; // TODO FIX THIS MAGIC NUMBER HERE



var STARTING_TABLE_LEFT = 30
var STARTING_TABLE_TOP = 120
var STARTING_TABLE_RIGHT = canvas.width / 2 - 100
var STARTING_TABLE_BOTTOM = canvas.height - 20

var cards = [["Spear",2500,20000], ["Gold Bars",5000,25000], ["Can of gold",100,1000],
 ["Shield",3000,7500], ["Chest of Gold",2500, 10000], ["Axe",2500, 12500],
 ["Wand",500 ,4000], ["Toxic Chest", 10, 20000], ["Old Bottle", 5, 2000],
 ["Sword", 200, 10000]];

var COST_LIMIT = 30000

function VALUE_UNIT_STRING(amount) {
  return String(amount) + " gold";
}

function COST_UNIT_STRING(amount) {
  return String(amount/1000) + " KG";
}

// The status keeps track of where cards are, and the score.
// It ensures that cards can not be added if they'd push the score over.

class Status {
  constructor() {
    console.log("Running the constructor");
    this.totalCostChosen = 0
    this.totalValueChosen = 0
    this.chosenSet = new Set();
    this.statusText = new paper.PointText(new paper.Point(840, 40), 300);
    this.statusText.fontFamily = 'arial';
    this.statusText.fontSize = 20;
    this.statusText.strokeColor = 'black';
    this.bestScoreSoFar = 0;

    this.updateDisplay();
  }

  // Update the display
  updateDisplay() {
    this.statusText.content = "In the bag:   " + String(this.totalValueChosen)
    + " gold    " + String(this.totalCostChosen/1000) + " KG"
    + "\nMaximum allowed: " + String(COST_LIMIT/1000) + " KG"
    + "\nBest so far: " + String(this.bestScoreSoFar) + " gold";
  }

  // If the move was invalid, then the callback should be called.
  moveCard(card) {
    // Work out where the card has been moved to
    //If the item has just been moved into the "in" area
    if (card.getCenterPoint().x > CENTER_POSITION && !this.chosenSet.has(card)) {
      // If the item pushes us over the cost limit, we want to send it back
      if (card.itemCost + this.totalCostChosen > COST_LIMIT) {
        return false;
      }
      else { // Otherwise, add it to the chosen set and add it to the score
        this.chosenSet.add(card);
        this.totalCostChosen += card.itemCost;
        this.totalValueChosen += card.itemValue;
        if (this.totalValueChosen > this.bestScoreSoFar) {
          this.bestScoreSoFar = this.totalValueChosen;
        }
      }
    }
    //Else if the item has just been moved out, and was previously in...
    else if (card.getCenterPoint().x < CENTER_POSITION && this.chosenSet.has(card)) {
     // ... then we want to remove it from the "in" set and subtract it from score
      this.chosenSet.delete(card);
      this.totalCostChosen -= card.itemCost;
      this.totalValueChosen -= card.itemValue;
    }
    this.updateDisplay();
    return true;
  };
};



class Card {

  constructor(xPos, yPos, item, value, cost) {
    this.previousStillPosition = new paper.Point(xPos, yPos); // Used to cancel invalid moves
    this.currentlyActive = false; // Used to determine whether or not this card should be responding to mouse drags
    this.itemValue = value;
    this.itemCost = cost;
    this.itemName = item;
    this.cardDrawing = this.buildCardSprite(new paper.Point(xPos, yPos));
    this.cardDrawing.onMouseDrag = (e) => { this.onCardDragged(e); }
    this.cardDrawing.onMouseDown = (e) => { this.onCardMouseDown(e); }
    this.cardDrawing.onMouseUp = (e) => {this.onCardMouseUp(e); }
  }

  getCenterPoint() {
    return new paper.Point(this.cardDrawing.position.x, this.cardDrawing.position.y);
  }

  getTopLeftPoint() {
    return new paper.Point(this.cardDrawing.position.x - CARD_WIDTH/2,
      this.cardDrawing.position.y - CARD_WIDTH/2);
  }

  // Builds the sprite for the card.
  // TopLeft is the topLeft corner that the sprite should be drawn from
  buildCardSprite(topLeft) {
    // Draw the card background
    var cardBackground = new paper.Path.Rectangle(topLeft, CARD_WIDTH, CARD_HEIGHT);
    cardBackground.fillColor = CARD_BACKGROUND_COLOR;

    // Draw the card value text
    var valueTextPosition = new paper.Point(topLeft.x + CARD_PADDING, topLeft.y + CARD_FONT_SIZE + CARD_PADDING);// + CARD_PADDING);
    var valueText = new paper.PointText(valueTextPosition, CARD_TEXT_LENGTH);
    valueText.content = VALUE_UNIT_STRING(this.itemValue);
    valueText.fillColor = CARD_WRITING_COLOR;
    valueText.fontSize = CARD_FONT_SIZE;

    // Draw the card cost text
    var costTextPosition = new paper.Point(topLeft.x + CARD_PADDING, topLeft.y + CARD_HEIGHT - CARD_PADDING);
    var costText = new paper.PointText(costTextPosition, CARD_TEXT_LENGTH);
    costText.content = COST_UNIT_STRING(this.itemCost);
    costText.fillColor = CARD_WRITING_COLOR;
    costText.fontSize = CARD_FONT_SIZE;

    return new paper.Group([cardBackground, valueText, costText]);
  }

  onCardMouseDown(e) {
    // Tell the card to now respond to any drag events, as it had the mouse
    // pressed down on it. This code is necessary to prevent the card being
    // moved when another card is dragged over it.
    this.currentlyActive = true;
    // We want to keep track of the original position before the drag started,
    // incase permission is not received from the status for the final drop
    // position, in which case we want to move the card back where it started.
    this.previousStillPosition = this.cardDrawing.position;
  }


  onCardDragged(e) {
    // This event was triggered by another card being dragged over this one,
    // so we want to ignore it
    if (!this.currentlyActive) {
      return;
    }

    // We don't want the card going under other cards while being dragged
    this.cardDrawing.bringToFront();

    // Move the card in the x and y dimensions, ensuring it stays within the canvas
    if (e.point.x + CARD_WIDTH/2 > CARD_MAX_X) {
      this.cardDrawing.position.x = CARD_MAX_X - CARD_WIDTH/2;
    }
    else if (e.point.x - CARD_WIDTH/2 < CARD_MIN_X) {
      this.cardDrawing.position.x = CARD_MIN_X + CARD_WIDTH/2;
    }
    else {
      this.cardDrawing.position.x = e.point.x;
    }

    if (e.point.y + CARD_WIDTH/2 > CARD_MAX_Y) {
      this.cardDrawing.position.y = CARD_MAX_Y - CARD_HEIGHT/2;
    }
    else if (e.point.y - CARD_WIDTH/2 < CARD_MIN_Y) {
      this.cardDrawing.position.y = CARD_MIN_Y + CARD_HEIGHT/2;
    }
    else { // Move card in y dimension
      this.cardDrawing.position.y = e.point.y;
    }
  }


  // Is the card overlapping with the center, on the left?
  cardNearCenterLeft() {
    return this.cardDrawing.position.x < CENTER_POSITION
      && CENTER_POSITION - this.cardDrawing.position.x <= CARD_WIDTH / 2;
  }


  // is the card overlapping with the center, on the right?
  cardNearCenterRight() {
    return this.cardDrawing.position.x > CENTER_POSITION
      && this.cardDrawing.position.x - CENTER_POSITION <= CARD_WIDTH/2;
  }


  onCardMouseUp(e) {
    this.currentlyActive = false; // No longer moving this card

    // Make sure the card wasn't dropped on the centre line. If it was, pick
    // a side to move it to

    if (this.cardNearCenterLeft()) {
      this.cardDrawing.position.x = CENTER_POSITION - CARD_WIDTH/2 - CARD_PADDING;
    }
    else if (this.cardNearCenterRight()) {
      this.cardDrawing.position.x = CENTER_POSITION + CARD_WIDTH/2 + CARD_PADDING;
    }
    if (!gameStatus.moveCard(this)) {
      this.cardDrawing.position = this.previousStillPosition;
    }
  }
}



function addCards(cards) {
   var xPos = STARTING_TABLE_LEFT;
   var yPos = STARTING_TABLE_TOP;

   for (var [item, value, cost] of cards) {
     var card = new Card(xPos, yPos, item, value, cost);
     paper.view.draw();
     xPos += CARD_WIDTH + 10;
     if (xPos + CARD_WIDTH >= STARTING_TABLE_RIGHT) {
       xPos = STARTING_TABLE_LEFT
       yPos += CARD_WIDTH + 10;
     }
   }
 };




function drawArea() {
  var line = new paper.Path.Line(new paper.Point(canvas.width/2, 5), new paper.Point(canvas.width/2, canvas.height - 5));
  line.strokeColor = 'black';
  var acrossLine = new paper.Path.Line(new paper.Point(5, 100), new paper.Point(canvas.width - 5, 100));
  acrossLine.strokeColor = 'black';

  var titleLeaveBehind = new paper.PointText(new paper.Point(40,60, 200));
  titleLeaveBehind.fillColor = 'black';
  titleLeaveBehind.fontFamily = 'arial';
  titleLeaveBehind.fontSize = 40
  titleLeaveBehind.content = 'LEAVE'

  var titleTake = new paper.PointText(new paper.Point(canvas.width/2 + 40,60, 200));
  titleTake.fillColor = 'black';
  titleTake.fontFamily = 'arial';
  titleTake.fontSize = 40
  titleTake.content = 'TAKE'

}

drawArea();
console.log("Got this far");
var gameStatus = new Status();
console.log("And got this far");
addCards(cards);

//
//
// // Create a Paper.js Path to draw a line into it:
// // Give the stroke a color
// path.strokeColor = 'black';
// var start = new paper.Point(100, 100);
// // Move to start and draw a line from there
// path.moveTo(start);
// // Note that the plus operator on Point objects does not work
// // in JavaScript. Instead, we need to call the add() function:
// path.lineTo(start.add([ 200, -50 ]));
// // Draw the view now:
// //paper.view.draw();
