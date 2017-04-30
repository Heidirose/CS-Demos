// Set up paper.js on the canvas
var canvas = document.getElementById('container');
paper.setup(canvas);


// Choose colors for the user-interface
var INTERFACE_COLOR_MAIN = 'brown';
var INTERFACE_COLOR_SECONDARY = 'black';
var INTERFACE_COLOR_TYPOGRAPHY = '#e6e6e6';


var CENTER_POSITION = canvas.width/2 + 100;

var HEADING_SIZE = 50;
var HEADING_FONT = "arial";
var HEADING_LEFT_MARGIN = 40;
var HEADING_TOP_PADDING = 70;
var REJECTED_HEADING = "STUFF TO LEAVE BEHIND";
var CHOSEN_HEADING = "STUFF TO TAKE";

var CARD_BACKGROUND_COLOR = '#333333';
var CARD_WRITING_COLOR_COST = '#cccccc';
var CARD_WRITING_COLOR_VALUE = '#ebc747';
var CARD_BORDER_COLOR = '#cccccc';

var CARD_HEIGHT = 150;
var CARD_WIDTH = 100;
var CARD_PADDING = 10;
var CARD_STARTING_MARGIN = 20;
var CARD_FONT_SIZE = 16;
var CARD_TEXT_LENGTH = CARD_WIDTH - CARD_PADDING * 2;

var CARD_MAX_X = canvas.width;
var CARD_MIN_X = 0
var CARD_MAX_Y = canvas.height -100;
var CARD_MIN_Y = 100;

var STARTING_TABLE_LEFT = CARD_WIDTH/2 + 30
var STARTING_TABLE_TOP = CARD_HEIGHT/2 + CARD_MIN_Y + 30;
var STARTING_TABLE_RIGHT = canvas.width / 2 - 100
var STARTING_TABLE_BOTTOM = canvas.height - 20

var GOAL_TABLE_LEFT = CENTER_POSITION;
var GOAL_TABLE_TOP = CARD_MIN_Y;
var GOAL_TABLE_RIGHT = CARD_MAX_X;
var GOAL_TABLE_BOTTOM = CARD_MAX_Y;


// Card data
var cards = [["Spear",2500,20000, "spear.png"], ["Gold Bars",5000,25000, "gold-bars.png"], ["Can of gold",100,1000, 'gold-can.png'],
 ["Shield",3000,7500, "shield.png"], ["Chest of Gold",2500, 10000, "gold-chest.png"], ["Axe",2500, 12500, "axe.png"],
 ["Wand",500 ,4000, "wand.png"], ["Toxic Chest", 10, 20000, "toxic-chest.png"], ["Old Bottle", 5, 2000, "bottle.png"],
 ["Sword", 200, 10000,"sword.png"]];
var COST_LIMIT = 30000

// Answers for the data
var BEST_VALUE_ANSWER = 8000
var BEST_VALUE_ITEMS = new Set(["Chest of Gold", "Axe", "Shield"]);

function VALUE_UNIT_STRING(amount) {
  return String(amount) + " gold";
}

function COST_UNIT_STRING(amount) {
  return String(amount/1000) + " KG";
}

// The status keeps track of where cards are, and the score.
// It ensures that cards can not be added if they'd push the score over.


class TableGeometry {

  constructor() {
    this.drawTable();
  }

  drawTable() {
    var centerLine = new paper.Path.Line({
      from: [CENTER_POSITION, 0],
      to: [CENTER_POSITION, canvas.height],
      strokeColor: INTERFACE_COLOR_SECONDARY,
      strokeWidth: 10
    });
    var leaveTitle = new paper.PointText({
      point: [HEADING_LEFT_MARGIN, HEADING_TOP_PADDING],
      fillColor: INTERFACE_COLOR_TYPOGRAPHY,
      fontFamily: HEADING_FONT,
      fontSize: HEADING_SIZE,
      content: REJECTED_HEADING
    });

    var chooseTitle = new paper.PointText({
      point: [CENTER_POSITION + HEADING_LEFT_MARGIN, HEADING_TOP_PADDING],
      fillColor: INTERFACE_COLOR_TYPOGRAPHY,
      fontFamily: HEADING_FONT,
      fontSize: HEADING_SIZE,
      content: CHOSEN_HEADING
    });

    var instructions = new paper.PointText({
      point: [HEADING_LEFT_MARGIN, canvas.height - 20],
      fillColor: INTERFACE_COLOR_TYPOGRAPHY,
      fontFamily: HEADING_FONT,
      fontSize: 20,
      content: "Choose items to maximise gold, but don't go over " + COST_UNIT_STRING(30000) + "!"
    });
  }

  pointInGoalArea(point) {
    return point.x > GOAL_TABLE_LEFT && point.x < GOAL_TABLE_RIGHT
      && point.y > GOAL_TABLE_TOP && point.y < GOAL_TABLE_BOTTOM;
  }

  pointOutOfGoalArea(point) {
    return !this.pointInGoalArea(point);
  }

  cardInGoalArea(card) {
    return this.pointInGoalArea(card.getCenterPoint());
  }

  cardOutOfGoalArea(card) {
    return !this.cardInGoalArea(card);
  }

  // Layout a set of cards into their initial positions on the table
  addCardsToTable(cardObjects) {
    var xPos = STARTING_TABLE_LEFT;
    var yPos = STARTING_TABLE_TOP;
    for (var card of cardObjects) {
      card.setCenterPoint(xPos, yPos);
      xPos += CARD_WIDTH + CARD_STARTING_MARGIN;
      if (xPos > STARTING_TABLE_RIGHT) {
        xPos = STARTING_TABLE_LEFT;
        yPos += CARD_HEIGHT + CARD_STARTING_MARGIN;
      }
    }
  }

  cardOnCenterLine(card) {
    return Math.abs(card.getCenterPoint().x - GOAL_TABLE_LEFT) < CARD_WIDTH/2;
  }
}



function createCards(cards) {
  var cardSet = new Set()
  for (var [item, value, cost, fileName] of cards) {
    var card = new Card(item, value, cost, fileName);
    cardSet.add(card);
  }
  geometry.addCardsToTable(cardSet);
}




class Status {
  constructor() {
    console.log("Running the constructor");
    this.totalCostChosen = 0
    this.totalValueChosen = 0
    this.chosenSet = new Set();
    this.statusText = new paper.PointText(new paper.Point(CENTER_POSITION + HEADING_LEFT_MARGIN, canvas.height - 60), 300);
    this.statusText.fontFamily = 'arial';
    this.statusText.fontSize = 20;
    this.statusText.fillColor = INTERFACE_COLOR_TYPOGRAPHY;
    this.bestScoreSoFar = 0;

    this.updateDisplay();
  }

  // Update the display
  updateDisplay() {
    this.statusText.content = "In the bag:     "  + String(this.totalValueChosen)
    + " gold       " + String(this.totalCostChosen/1000) + " KG"
    + "\n\nBest so far: " + String(this.bestScoreSoFar) + " gold";
  }


  moveCard(card) {
    // Work out where the card has been moved to
    //If the item has just been moved into the "in" area
    if (geometry.pointInGoalArea(card.getCenterPoint()) && !this.chosenSet.has(card)) {
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
    else if (geometry.pointOutOfGoalArea(card.getCenterPoint()) && this.chosenSet.has(card)) {
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

  constructor(item, value, cost, fileName) {
    this.previousStillPosition = new paper.Point(0, 0); // Used to cancel invalid moves
    this.currentlyActive = false; // Used to determine whether or not this card should be responding to mouse drags
    this.itemValue = value;
    this.itemCost = cost;
    this.itemName = item;
    this.imageFileName = fileName;
    this.cardDrawing = this.buildCardSprite(new paper.Point(0, 0));
    this.cardDrawing.onMouseDrag = (e) => { this.onCardDragged(e); }
    this.cardDrawing.onMouseDown = (e) => { this.onCardMouseDown(e); }
    this.cardDrawing.onMouseUp = (e) => {this.onCardMouseUp(e); }
  }

  getCenterPoint() {
    return new paper.Point(this.cardDrawing.position.x, this.cardDrawing.position.y);
  }

  setCenterPoint(xPos, yPos) {
    this.cardDrawing.position = new paper.Point(xPos, yPos);
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
    cardBackground.strokeColor = CARD_BORDER_COLOR;

    // Draw the card value text
    var valueTextPosition = new paper.Point(topLeft.x + CARD_PADDING, topLeft.y + CARD_FONT_SIZE + CARD_PADDING);// + CARD_PADDING);
    var valueText = new paper.PointText(valueTextPosition, CARD_TEXT_LENGTH);
    valueText.content = VALUE_UNIT_STRING(this.itemValue);
    valueText.fillColor = CARD_WRITING_COLOR_VALUE;
    valueText.fontSize = CARD_FONT_SIZE;
    valueText.fontWeight = 'bold';

    var cardImage =  new paper.Raster('../resources/images/' + this.imageFileName);
    cardImage.onLoad = function() {
      cardImage.width = 80;
      cardImage.height = 80;
    }
    cardImage.position = cardBackground.position;

    // Draw the card cost text
    var costTextPosition = new paper.Point(topLeft.x + CARD_PADDING, topLeft.y + CARD_HEIGHT - CARD_PADDING);
    var costText = new paper.PointText(costTextPosition, CARD_TEXT_LENGTH);
    costText.content = COST_UNIT_STRING(this.itemCost);
    costText.fillColor = CARD_WRITING_COLOR_COST;
    costText.fontSize = CARD_FONT_SIZE;
    costText.fontWeight = 'bold';

    return new paper.Group([cardBackground, cardImage, valueText, costText]);
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


  onCardMouseUp(e) {
    this.currentlyActive = false; // No longer moving this card
    // Make sure the card wasn't dropped on the centre line. If it was, pick
     // a side to move it to
    if (geometry.cardOnCenterLine(this)) {
      if (geometry.cardInGoalArea(this)) {
        this.cardDrawing.position.x = CENTER_POSITION + CARD_WIDTH/2 + CARD_PADDING;
      }
      else {
        this.cardDrawing.position.x = CENTER_POSITION - CARD_WIDTH/2 - CARD_PADDING;
      }
    }
    if (!gameStatus.moveCard(this)) {
      this.cardDrawing.position = this.previousStillPosition;
    }
  }
}


var geometry = new TableGeometry();
console.log("Got this far");
var gameStatus = new Status();
console.log("And got this far");
createCards(cards);

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
