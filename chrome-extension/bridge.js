// Ce script est injecté sur https://jumblecanvas.netlify.app et sert de pont
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ADD_TO_SPACE") {
    console.log("Jumble Bridge: Reçu", request.payload);
    // Envoi du message au contexte de la page (React)
    window.postMessage({
      type: "SPACE_ADD_ELEMENT",
      payload: request.payload
    }, "*");
    sendResponse({ status: "success" });
  }
});

