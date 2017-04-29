// Set up paper.js on the canvas
var canvas = document.getElementById('container');
paper.setup(canvas);


var CARD_HEIGHT = 100
var CARD_WIDTH = 100

var STARTING_TABLE_LEFT = 30
var STARTING_TABLE_TOP = 120
var STARTING_TABLE_RIGHT = canvas.width / 2 - 100
var STARTING_TABLE_BOTTOM = canvas.height - 20

var totalCostChosen = 0;
var totalValueChosen = 0;
var chosenSet = new Set();


var cards = [["Spear",2500,20000], ["Gold Bars",5000,25000], ["Can of gold",100,1000],
 ["Shield",3000,7500], ["Chest of Gold",2500, 10000], ["Axe",2500, 12500],
 ["Wand",500 ,4000], ["Toxic Chest", 10, 20000], ["Old Bottle", 5, 2000],
 ["Sword", 200, 10000]];
 var COST_LIMIT = 30000


class statusBar {
  constructor() {
    this.totalCostChosen = 0
    this.totalValueChosen = 0
  }

}

class Card {
  constructor(xPos, yPos, item, value, cost) {

    var topLeft = new paper.Point(xPos, yPos);
    var cardBackground = new paper.Path.Rectangle(topLeft, CARD_WIDTH, CARD_HEIGHT);
    cardBackground.fillColor = 'lightblue';

    var cardText = new paper.PointText(new paper.Point(0, 0), CARD_WIDTH - 1);
    cardText.justification = 'center';
    cardText.fillColor = 'black';
    cardText.content = String(item) + "\n\n" + String(value) + " gold\n\n" + String(cost/1000) + " KG";
    cardText.position.x = cardBackground.position.x
    cardText.position.y = cardBackground.position.y

    var group = new paper.Group([cardBackground, cardText]);
    group.onMouseDrag = (e) => {
      this.onCardDragged(e);
    }
    this.currentlyActive = false;

    group.onMouseDown  = (e) => {
      this.currentlyActive = true;
    }
    group.onMouseUp  = (e) => {
      this.currentlyActive = false;
      if (this.outerRectangle.position.x <= canvas.width/2
        && this.outerRectangle.position.x > canvas.width/2 - CARD_WIDTH/2) {
        for (var child of this.card.children) {
          child.position.x = canvas.width/2 - CARD_WIDTH/2 - 10
        }
      }
      else if (this.outerRectangle.position.x > canvas.width/2
        && this.outerRectangle.position.x < canvas.width/2 + CARD_WIDTH/2) {
        for (var child of this.card.children) {
          child.position.x = canvas.width/2 + CARD_WIDTH/2 + 10
        }
      }

      //The item has just been moved into the "in" area
      if (this.outerRectangle.position.x > canvas.width/2
      && !chosenSet.has(this)) {
        // If the item pushes us over the cost limit, we want to send it back
        if (this.itemCost + totalCostChosen > COST_LIMIT) {
          for (var child of this.card.children) {
            child.position.x = canvas.width/2 - CARD_WIDTH/2 - 10
          }
        }
        else { // Otherwise, add it to the chosen set and add it to the score
          chosenSet.add(this);
          totalCostChosen += this.itemCost;
          totalValueChosen += this.itemValue;
          console.log(totalCostChosen);
          console.log(totalValueChosen)
        }
      }
      //Else if the item has just been moved out...
      else if (this.outerRectangle.position.x < canvas.width/2
      && chosenSet.has(this)) {
        //... then we want to remove it from the "in" set and subtract it from score
        chosenSet.delete(this);
        totalCostChosen -= this.itemCost;
        totalValueChosen -= this.itemValue;
      }
    }
    this.outerRectangle = cardBackground;
    this.card = group;
    this.itemValue = value;
    this.itemCost = cost;
    this.itemName = item;
  }

  onCardDragged(e) {
    if (!this.currentlyActive) {
      return;
    }
    this.card.bringToFront();
    for (var child of this.card.children) {
      child.position.x = e.point.x
      child.position.y = e.point.y;
      if (child.position.x + CARD_WIDTH/2 >= canvas.width) {
        child.position.x = canvas.width - CARD_WIDTH/2;
      }
      if (child.position.x - CARD_WIDTH/2 <= 0) {
        child.position.x = CARD_WIDTH/2
      }
      if (child.position.y + CARD_HEIGHT/2 >= canvas.height) {
        child.position.y = canvas.height - CARD_HEIGHT/2;
      }
      if (child.position.y - CARD_HEIGHT/2 <= 100) {
        child.position.y = 100 + CARD_HEIGHT/2
      }
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

addCards(cards);
