const appId = '65355';  // Specified App ID
const token = 'sd6rB58yVyxti8B';  // API token

// WebSocket connection
let socket;
const tickPrices = [];
const digitCounts = Array(10).fill(0);
let evenCount = 0;
let oddCount = 0;

document.getElementById("run-analysis").onclick = () => {
  // Initialize WebSocket and start receiving ticks
  socket = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + appId);

  socket.onopen = () => {
    socket.send(JSON.stringify({ authorize: token }));
    socket.send(JSON.stringify({ ticks: "R_50", subscribe: 1 }));
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.msg_type === 'authorize') {
      console.log("Authorized");
    }

    if (data.msg_type === 'tick') {
      const tickPrice = parseFloat(data.tick.quote);
      const lastDigit = tickPrice.toFixed(2).slice(-1);
      updateTickData(tickPrice, parseInt(lastDigit));
      updateDisplay(tickPrice, lastDigit);

      // Check if we should buy based on even or odd percentage conditions
      const evenPercentage = (evenCount / tickPrices.length) * 100;
      const oddPercentage = (oddCount / tickPrices.length) * 100;

      if (evenPercentage > 64) {
        buyContract("CALL"); // Buy CALL for even
      } else if (oddPercentage > 64) {
        buyContract("PUT");  // Buy PUT for odd
      }
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed.");
  };
};

function updateTickData(tickPrice, lastDigit) {
  tickPrices.push(lastDigit);

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

function updateDigitPercentages() {
  const totalTicks = tickPrices.length;
  const tbody = document.querySelector("#digit-percentage-table tbody");
  tbody.innerHTML = "";

  digitCounts.forEach((count, digit) => {
    const percentage = ((count / totalTicks) * 100).toFixed(2);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${digit}</td>
      <td>${percentage}%</td>
    `;
    tbody.appendChild(row);
  });
}

function updateEvenOddPercentages() {
  const totalTicks = tickPrices.length;
  const evenPercentage = ((evenCount / totalTicks) * 100).toFixed(2);
  const oddPercentage = ((oddCount / totalTicks) * 100).toFixed(2);

  document.getElementById("even-percentage").textContent = `${evenPercentage}%`;
  document.getElementById("odd-percentage").textContent = `${oddPercentage}%`;
}

function updateDisplay(tickPrice, lastDigit) {
  const tickCount = tickPrices.length;
  document.getElementById("tick-price").textContent = tickPrice.toFixed(2);
  document.getElementById("last-digit").textContent = lastDigit;
  document.getElementById("tick-count").textContent = tickCount;
}

// Function to buy a contract
function buyContract(contractType) {
  console.log(`Buying ${contractType} contract...`);

  socket.send(JSON.stringify({
    buy: 1,
    price: 1, // Set stake to 1
    parameters: {
      contract_type: contractType, // "CALL" for even, "PUT" for odd
      symbol: "R_50",
      duration: 1, // Set duration to 1 tick
      duration_unit: "t",
      basis: "stake",
      currency: "USD"
    }
  }));
}
