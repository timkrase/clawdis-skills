#!/usr/bin/env node
/**
 * Decide - A decision helper CLI
 * Usage: decide.js <command> [args] [--raw]
 */

const EIGHT_BALL_RESPONSES = [
  // Positive
  { text: "It is certain", mood: "positive", de: "Es ist sicher" },
  { text: "It is decidedly so", mood: "positive", de: "Ganz bestimmt" },
  { text: "Without a doubt", mood: "positive", de: "Ohne Zweifel" },
  { text: "Yes, definitely", mood: "positive", de: "Ja, definitiv" },
  { text: "You may rely on it", mood: "positive", de: "Du kannst dich darauf verlassen" },
  { text: "As I see it, yes", mood: "positive", de: "So wie ich es sehe, ja" },
  { text: "Most likely", mood: "positive", de: "Höchstwahrscheinlich" },
  { text: "Outlook good", mood: "positive", de: "Aussichten gut" },
  { text: "Yes", mood: "positive", de: "Ja" },
  { text: "Signs point to yes", mood: "positive", de: "Die Zeichen stehen auf Ja" },
  // Neutral
  { text: "Reply hazy, try again", mood: "neutral", de: "Antwort unklar, frag nochmal" },
  { text: "Ask again later", mood: "neutral", de: "Frag später nochmal" },
  { text: "Better not tell you now", mood: "neutral", de: "Besser, ich sag's dir jetzt nicht" },
  { text: "Cannot predict now", mood: "neutral", de: "Kann ich jetzt nicht vorhersagen" },
  { text: "Concentrate and ask again", mood: "neutral", de: "Konzentrier dich und frag nochmal" },
  // Negative
  { text: "Don't count on it", mood: "negative", de: "Zähl nicht drauf" },
  { text: "My reply is no", mood: "negative", de: "Meine Antwort ist Nein" },
  { text: "My sources say no", mood: "negative", de: "Meine Quellen sagen Nein" },
  { text: "Outlook not so good", mood: "negative", de: "Aussichten nicht so gut" },
  { text: "Very doubtful", mood: "negative", de: "Sehr zweifelhaft" },
];

const COIN_SIDES = [
  { en: "Heads", de: "Kopf", emoji: "👑" },
  { en: "Tails", de: "Zahl", emoji: "🦅" },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function parseDice(notation) {
  // Parse NdX format (e.g., "2d6", "d20", "3d8")
  const match = notation.toLowerCase().match(/^(\d*)d(\d+)$/);
  if (!match) return null;
  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  return { count, sides };
}

function rollDice(notation = "d6") {
  const dice = parseDice(notation);
  if (!dice) {
    return { error: `Invalid dice notation: ${notation}` };
  }
  
  const rolls = [];
  for (let i = 0; i < dice.count; i++) {
    rolls.push(randomInt(1, dice.sides));
  }
  
  const total = rolls.reduce((a, b) => a + b, 0);
  
  return {
    type: "roll",
    notation,
    rolls,
    total,
    emoji: "🎲",
  };
}

function flip() {
  const side = pickRandom(COIN_SIDES);
  return {
    type: "flip",
    result: side.en,
    resultDe: side.de,
    emoji: "🪙",
  };
}

function pick(options) {
  if (options.length === 0) {
    return { error: "No options provided" };
  }
  const choice = pickRandom(options);
  return {
    type: "pick",
    options,
    result: choice,
    emoji: "🎯",
  };
}

function eightBall(question) {
  const response = pickRandom(EIGHT_BALL_RESPONSES);
  const moodEmoji = {
    positive: "✨",
    neutral: "🤔",
    negative: "😬",
  };
  return {
    type: "8ball",
    question,
    result: response.text,
    resultDe: response.de,
    mood: response.mood,
    emoji: moodEmoji[response.mood] || "🎱",
  };
}

function yesNo() {
  const yes = Math.random() < 0.5;
  return {
    type: "yesno",
    result: yes ? "Yes" : "No",
    resultDe: yes ? "Ja" : "Nein",
    emoji: yes ? "✅" : "❌",
  };
}

function randomNumber(min = 1, max = 100) {
  const num = randomInt(min, max);
  return {
    type: "number",
    min,
    max,
    result: num,
    emoji: "🔢",
  };
}

// Parse args
const args = process.argv.slice(2);
const rawMode = args.includes("--raw");
const filteredArgs = args.filter(a => a !== "--raw");

const command = filteredArgs[0] || "help";
const commandArgs = filteredArgs.slice(1);

let result;

switch (command) {
  case "flip":
  case "coin":
  case "münze":
    result = flip();
    break;
    
  case "roll":
  case "dice":
  case "würfel":
    result = rollDice(commandArgs[0] || "d6");
    break;
    
  case "pick":
  case "choose":
  case "wähle":
    result = pick(commandArgs);
    break;
    
  case "8ball":
  case "magic":
  case "frag":
    result = eightBall(commandArgs.join(" ") || "?");
    break;
    
  case "yesno":
  case "yn":
  case "jn":
    result = yesNo();
    break;
    
  case "number":
  case "zahl":
    const min = parseInt(commandArgs[0]) || 1;
    const max = parseInt(commandArgs[1]) || 100;
    result = randomNumber(min, max);
    break;
    
  case "help":
  default:
    console.log(`
Decide - A decision helper 🎲

Commands:
  flip              Flip a coin (Heads/Tails)
  roll [NdX]        Roll dice (default: d6, e.g., 2d20)
  pick <options>    Pick randomly from options
  8ball [question]  Ask the Magic 8-Ball
  yesno             Simple yes/no
  number [min max]  Random number (default: 1-100)

Options:
  --raw             Plain text output (just the result)

Examples:
  decide.js flip
  decide.js roll 2d6
  decide.js pick Pizza Burger Sushi
  decide.js 8ball "Should I do it?"
  decide.js number 1 10
`);
    process.exit(0);
}

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (rawMode) {
  // Raw output - just the result
  if (result.type === "roll") {
    console.log(result.total);
  } else {
    console.log(result.result);
  }
} else {
  // JSON output
  console.log(JSON.stringify(result, null, 2));
}
