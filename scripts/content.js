(() => {
  let completedConnectionsCount = 0,
    totalConnections = 10,
    isHalted = false,
    port = null;

  // Event listener to notify if tab is updated
  chrome.runtime.onMessage.addListener(function (
    request,
    _sender,
    _sendResponse
  ) {
    if (request.action === "tab-updated") {
      completedConnectionsCount = 0;
    }
  });

  //  OnConnect event listener which listens for event sent from popup.js
  chrome.runtime.onConnect.addListener(function (connectionsPort) {
    if (connectionsPort.name === "connections") {
      port = connectionsPort;
      totalConnections = getConnectBtnList().length;
      port.onMessage.addListener(function (request) {
        if (request.action === "get-default-data") {
          completedConnectionsCount = 0;
          port.postMessage({
            message: "default",
            completedConnectionsCount,
            percent: calculatePercent(),
            totalConnections,
          });
        } else if (request.action === "start-connecting") {
          const connectBtnList = getConnectBtnList();
          connectBtnList.forEach((connectBtn, index) => {
            connectBtn.addEventListener("click", (event) => {
              setTimeout(async () => {
                await handleConnectModal();
                completedConnectionsCount++;
                port.postMessage({
                  message: "connected",
                  completedConnectionsCount,
                  totalConnections,
                  percent: calculatePercent(),
                });
                if (completedConnectionsCount === totalConnections) {
                  port.postMessage({ message: "completed" });
                }
              }, 0);
            });
          });
          clickButtonAfterRandomInt(connectBtnList, isHalted);
        } else if (request.action === "resume-connecting") {
          isHalted = false;
          const connectBtnList = getConnectBtnList();
          clickButtonAfterRandomInt(connectBtnList, isHalted);
        } else if (request.action === "stop-connecting") {
          isHalted = true;
          port.postMessage({
            message: "stopped",
            pendingConnections: getConnectBtnList().length,
          });
        }
      });
      // listens for disconnect events.
      port.onDisconnect.addListener(() => {
        port = null;
      });
    }
    //  clicks on the connect button after modal is shown
    async function handleConnectModal() {
      await sleep(1000);
      const optionNode = document.querySelector(
        "button.artdeco-pill.artdeco-pill--slate.artdeco-pill--3.artdeco-pill--choice.ember-view.mt2"
      );
      const sendNowNode = document.querySelector(
        "button.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view.ml1"
      );
      if (optionNode) {
        optionNode.click();
        const connectNode = document.querySelector(
          "button.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view"
        );
        if (connectNode) {
          connectNode.click();
          await sleep(1000);
          const sendNowNode = document.querySelector(
            "button.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view.ml1"
          );
          if (sendNowNode) {
            sendNowNode.click();
          }
        }
      } else if (sendNowNode) {
        sendNowNode.click();
      }
    }
    // blocking sleep function that waits for n milliseconds
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function getRandomInt(min, max) {
      return Math.random() * (max - min) + min;
    }
    //  waits for random amount of time between 5 to 10 seconds before clicking on the button.
    function clickButtonAfterRandomInt(connectBtnList, isHalted) {
      let counter = connectBtnList.length;
      let total = connectBtnList.length;
      schedule();
      function schedule() {
        setTimeout(go, getRandomInt(5, 10) * 1000);
      }
      function go() {
        const connectBtn = connectBtnList[total - counter];
        if (isHalted) return;
        connectBtn.click();
        if (--counter > 0) {
          schedule();
        }
      }
    }
    //  calculates the percentage of the total number of connect buttons clicked.
    function calculatePercent() {
      return Math.round((completedConnectionsCount / totalConnections) * 100);
    }
  });
  //  gets the list of connect buttons available in the current page.
  function getConnectBtnList() {
    return Array.from(
      document.querySelectorAll(
        ".search-results-container .entity-result__item .entity-result__actions button"
      )
    ).filter(
      (btn) =>
        !btn.classList.contains("artdeco-button--muted") &&
        !btn
          .querySelector(".artdeco-button__text")
          .innerHTML.includes("Message")
    );
  }
})();
