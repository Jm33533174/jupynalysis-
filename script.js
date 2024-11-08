const appId = '65355';  // Specified App ID
const token = 'sd6rB58yVyxti8B';  // API token

let socket;
let tickPrices = [];
let digitCounts = Array(10).fill(0);
let evenCount = 0;
let oddCount = 0;
let totalTicks = 0;

// Run analysis button click handler
document.getElementById("run-analysis").onclick = () => {
  // Initialize WebSocket and start receiving ticks
  socket = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + appId);

  socket.onopen = () => {
    console.log("WebSocket connection opened.");
    // Authorize the WebSocket connection
    socket.send(JSON.stringify({ authorize: token }));
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("WebSocket message received:", data);

    if (data.msg_type === 'authorize' && data.authorize.status === 'ok') {
      console.log("Authorized successfully.");
      // After authorization, fetch the last 25 ticks
      fetchLastTicks();
    }

    if (data.msg_type === 'ticks') {
      const tickPrice = parseFloat(data.tick.quote);
      const lastDigit = tickPrice.toFixed(2).slice(-1);
      updateTickData(tickPrice, parseInt(lastDigit));
      updateDisplay(tickPrice, lastDigit);
    }

    if (data.msg_type === 'history') {
      handleHistoricalTicks(data.history);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed.");
  };
};

// Fetch the last 25 ticks from history
function fetchLastTicks() {
  console.log("Fetching last 25 ticks...");
  socket.send(JSON.stringify({
    ticks_history: "R_50",
    adjust_start_time: 1,
    count: 25,
    end: "latest",
    start: 1,
    style: "ticks"
  }));
}

// Handle historical ticks
function handleHistoricalTicks(history) {
  console.log("Handling historical ticks...");
  history.forEach(tick => {
    const tickPrice = parseFloat(tick.quote);
    const lastDigit = tickPrice.toFixed(2).slice(-1);
    updateTickData(tickPrice, parseInt(lastDigit));
    updateDisplay(tickPrice, lastDigit);
  });
}

// Update statistics with the new tick
function updateTickData(tickPrice, lastDigit) {
  tickPrices.push(lastDigit);
  totalTicks++;

  if (tickPrices.length > 25) {
    const removedDigit = tickPrices.shift();
    digitCounts[removedDigit]--;
    removedDigit % 2 === 0 ? evenCount-- : oddCount--;
  }

  digitCounts[lastDigit]++;
  lastDigit % 2 === 0 ? evenCount++ : oddCount++;

  updateDigitPercentages();
  updateEvenOddPercentages();
}

// Update the digit percentage table
function updateDigitPercentages() {
  const tbody = document.querySelector("#digit-percentage-table tbody");
  tbody.innerHTML = "";

  digitCounts.forEach((count, digit) => {
    if (count > 0) {
      const percentage = ((count / tickPrices.length) * 100).toFixed(2);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${digit}</td>
        <td>${percentage}%</td>
      `;
      tbody.appendChild(row);
    }
  });
}

// Update the even/odd percentages
function updateEvenOddPercentages() {
  const evenPercentage = ((evenCount / totalTicks) * 100).toFixed(2);
  const oddPercentage = ((oddCount / totalTicks) * 100).toFixed(2);

  document.getElementById("even-percentage").textContent = `${evenPercentage}%`;
  document.getElementById("odd-percentage").textContent = `${oddPercentage}%`;
}

// Update the display with the latest tick information
function updateDisplay(tickPrice, lastDigit) {
  console.log(`Updating display with Tick Price: ${tickPrice}, Last Digit: ${lastDigit}`);
  document.getElementById("tick-price").textContent = tickPrice.toFixed(2);
  document.getElementById("last-digit").textContent = lastDigit;
  document.getElementById("tick-count").textContent = totalTicks;
}
