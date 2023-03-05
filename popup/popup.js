import { getActiveTabURL } from "../scripts/utils.js";
import { RequestStatus, ActionButtonView, MessageTypes } from "./types.js";

let currentRequestStatus = RequestStatus.NONE,
  actionButtonElement = document.getElementById("js-button-action"),
  closeButtonElement = document.getElementById("js-btn-close"),
  circle = document.querySelector("circle");

setLoaderView();

const tab = await getActiveTabURL();
const port = await chrome.tabs.connect(tab.id, { name: "connections" });
await port.postMessage({ action: "get-default-data" });

port.onMessage.addListener(
  ({
    message,
    completedConnectionsCount,
    percent,
    pendingConnections,
    totalConnections,
  }) => {
    if ([MessageTypes.DEFAULT, MessageTypes.CONNECTED].includes(message)) {
      setCurrentRequestStatus(completedConnectionsCount);
      setCountView(completedConnectionsCount);
      setProgressView(percent);
      if (percent === 100) {
        disableButton(actionButtonElement);
      }
    } else if (message === MessageTypes.STOPPED) {
      disableButton(actionButtonElement);
      setTimeout(() => {
        enableButton(actionButtonElement);
      }, pendingConnections * 250 + 250);
    } else if (message === MessageTypes.COMPLETED)
      completedLinkedInConnections();
  }
);

function manageLinkedInConnections() {
  const prevRequestStatus = currentRequestStatus;
  switch (prevRequestStatus) {
    case RequestStatus.NONE:
      currentRequestStatus = RequestStatus.INPROGRESS;
      startLinkedInConnections();
      break;
    case RequestStatus.HALTED:
      currentRequestStatus = RequestStatus.INPROGRESS;
      resumeLinkedInConnections();
      break;
    case RequestStatus.INPROGRESS:
      currentRequestStatus = RequestStatus.HALTED;
      stopLinkedInConnections();
      break;
    default:
      break;
  }
  toggleActionButtonView(prevRequestStatus);
}

async function startLinkedInConnections() {
  await port.postMessage({ action: "start-connecting" });
}

async function resumeLinkedInConnections() {
  await port.postMessage({ action: "resume-connecting" });
}

async function stopLinkedInConnections() {
  await port.postMessage({ action: "stop-connecting" });
}

function completedLinkedInConnections() {
  const prevRequestStatus = currentRequestStatus;
  currentRequestStatus = RequestStatus.COMPLETED;
  toggleActionButtonView(prevRequestStatus);
  showSuccessNotification();
}

function setCurrentRequestStatus(completedConnectionsCount) {}

// toggles action button style color changes
function toggleActionButtonView(prevRequestStatus) {
  actionButtonElement.classList.remove(
    ActionButtonView[prevRequestStatus].className
  );
  actionButtonElement.classList.add(
    ActionButtonView[currentRequestStatus].className
  );
  actionButtonElement.textContent = ActionButtonView[currentRequestStatus].name;
}

//  updates the connections count in the view
function setCountView(completedConnectionsCount) {
  document.getElementById("js-invitations-count").innerHTML =
    completedConnectionsCount;
  setProgressView(completedConnectionsCount);
}

//  handles the loader progress view
function setProgressView(percent) {
  const loaderCircumference = getCircleCircumference();
  const offset = loaderCircumference - (percent / 100) * loaderCircumference;
  circle.style.strokeDashoffset = offset;
}

//  sets the initial progress view
function setLoaderView() {
  const loaderCircumference = getCircleCircumference();
  circle.style.strokeDasharray = `${loaderCircumference} ${loaderCircumference}`;
  circle.style.strokeDashoffset = `${loaderCircumference}`;
}

function disableButton(btn) {
  btn.classList.add("btn-disabled");
}

function enableButton(btn) {
  btn.classList.remove("btn-disabled");
}

function getCircleCircumference() {
  return circle.r.baseVal.value * 2 * Math.PI;
}
//  shows success notification
function showSuccessNotification() {
  chrome.runtime.sendMessage({
    action: "create-notification",
    title: "Success",
    message: "LinkedIn Connection Requests Sent Successfully!",
  });
}

// Event Listeners
actionButtonElement.addEventListener("click", manageLinkedInConnections);
closeButtonElement.addEventListener("click", () => window.close());
