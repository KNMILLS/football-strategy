// Quick test to verify that "Reverse" plays are now categorized as run plays
// This simulates the logic from src/flow/narration/Broadcast.ts

function testPlayCategorization() {
  const isRun = /run|keeper|draw|trap|sneak|slant|off tackle|end run|reverse|razzle/i.test("Reverse") && !/pass/i.test("Reverse");
  const isPass = /pass|hook|look in|sideline|flair|flare|screen|down &/i.test("Reverse");

  console.log("Reverse play categorization:");
  console.log("isRun:", isRun); // Should be true after our fix
  console.log("isPass:", isPass); // Should be false

  // Test a few other plays to make sure we didn't break anything
  const testPlays = [
    "Power Up Middle",
    "Button Hook Pass",
    "End Run",
    "Reverse",
    "Razzle Dazzle"
  ];

  testPlays.forEach(play => {
    const run = /run|keeper|draw|trap|sneak|slant|off tackle|end run|reverse|razzle/i.test(play) && !/pass/i.test(play);
    const pass = /pass|hook|look in|sideline|flair|flare|screen|down &/i.test(play);
    console.log(`${play}: run=${run}, pass=${pass}`);
  });
}

testPlayCategorization();
