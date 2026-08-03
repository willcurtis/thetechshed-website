(() => {
  const toNumber = (parts) => parts.reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
  const toIp = (value) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
  const parseIp = (value) => {
    const parts = value.trim().split(".");
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
    return toNumber(parts.map(Number));
  };

  const subnetTool = document.querySelector("[data-subnet-tool]");
  if (subnetTool) {
    const form = subnetTool.querySelector("[data-subnet-form]");
    const error = subnetTool.querySelector("[data-subnet-error]");
    const fields = Object.fromEntries([...subnetTool.querySelectorAll("[data-result]")].map((element) => [element.dataset.result, element]));
    let currentResults = {};

    const setResult = (key, value) => {
      fields[key].textContent = value;
      currentResults[key] = value;
    };

    const calculate = () => {
      let ipValue = form.elements.ip.value.trim();
      let prefixValue = form.elements.prefix.value;
      if (ipValue.includes("/")) {
        const pieces = ipValue.split("/");
        if (pieces.length === 2 && pieces[1] !== "") {
          [ipValue, prefixValue] = pieces;
          form.elements.ip.value = ipValue;
          form.elements.prefix.value = prefixValue;
        }
      }

      const ip = parseIp(ipValue);
      const prefix = Number(prefixValue);
      if (ip === null) throw new Error("Enter a valid IPv4 address using four numbers from 0 to 255.");
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("The CIDR prefix must be a whole number from 0 to 32.");

      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const network = (ip & mask) >>> 0;
      const wildcard = (~mask) >>> 0;
      const broadcast = (network | wildcard) >>> 0;
      const total = 2 ** (32 - prefix);
      const pointToPoint = prefix === 31;
      const singleHost = prefix === 32;
      const first = singleHost ? network : pointToPoint ? network : network + 1;
      const last = singleHost ? network : pointToPoint ? broadcast : broadcast - 1;
      const usable = prefix >= 31 ? total : total - 2;

      setResult("cidr", `${toIp(network)}/${prefix}`);
      setResult("network", toIp(network));
      setResult("broadcast", toIp(broadcast));
      setResult("first", toIp(first >>> 0));
      setResult("last", toIp(last >>> 0));
      setResult("mask", toIp(mask));
      setResult("wildcard", toIp(wildcard));
      setResult("total", total.toLocaleString("en-GB"));
      setResult("usable", usable.toLocaleString("en-GB"));
      setResult("note", singleHost ? "A /32 identifies one host address." : pointToPoint ? "RFC 3021 permits both addresses on a point-to-point /31 link." : "Excludes the network and broadcast addresses.");
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        calculate();
        error.hidden = true;
      } catch (problem) {
        error.textContent = problem.message;
        error.hidden = false;
      }
    });

    subnetTool.querySelector("[data-copy-results]").addEventListener("click", async (event) => {
      const labels = { cidr: "Subnet", network: "Network", broadcast: "Broadcast", first: "First usable", last: "Last usable", mask: "Subnet mask", wildcard: "Wildcard mask", total: "Total addresses", usable: "Usable hosts" };
      const text = Object.entries(labels).map(([key, label]) => `${label}: ${currentResults[key]}`).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        event.currentTarget.textContent = "Copied";
        window.setTimeout(() => { event.currentTarget.textContent = "Copy results"; }, 1600);
      } catch {
        event.currentTarget.textContent = "Copy unavailable";
      }
    });
    calculate();
  }

  const wifiTool = document.querySelector("[data-wifi-tool]");
  if (wifiTool) {
    const form = wifiTool.querySelector("[data-wifi-form]");
    const security = form.elements.security;
    const password = form.elements.password;
    const passwordField = wifiTool.querySelector("[data-password-field]");
    const error = wifiTool.querySelector("[data-wifi-error]");
    const output = wifiTool.querySelector("[data-qr-output]");
    const placeholder = wifiTool.querySelector("[data-qr-placeholder]");
    const canvas = wifiTool.querySelector("[data-qr-canvas]");

    const escapeWifi = (value) => value.replace(/([\\;,:"])/g, "\\$1");
    const updateSecurity = () => {
      const openNetwork = security.value === "nopass";
      passwordField.hidden = openNetwork;
      password.required = !openNetwork;
      if (openNetwork) password.value = "";
    };

    security.addEventListener("change", updateSecurity);
    wifiTool.querySelector("[data-toggle-password]").addEventListener("click", (event) => {
      const showing = password.type === "text";
      password.type = showing ? "password" : "text";
      event.currentTarget.textContent = showing ? "Show" : "Hide";
      event.currentTarget.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const ssid = form.elements.ssid.value.trim();
      if (!ssid) {
        error.textContent = "Enter the Wi-Fi network name.";
        error.hidden = false;
        form.elements.ssid.focus();
        return;
      }
      if (security.value !== "nopass" && !password.value) {
        error.textContent = "Enter the network password, or choose No password.";
        error.hidden = false;
        password.focus();
        return;
      }

      const payload = `WIFI:T:${security.value};S:${escapeWifi(ssid)};P:${escapeWifi(password.value)};H:${form.elements.hidden.checked ? "true" : "false"};;`;
      try {
        const qr = window.qrcode(0, "M");
        qr.addData(payload, "Byte");
        qr.make();
        const modules = qr.getModuleCount();
        const quietZone = 4;
        const scale = Math.max(6, Math.floor(640 / (modules + quietZone * 2)));
        const size = (modules + quietZone * 2) * scale;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        context.fillStyle = "#000000";
        for (let row = 0; row < modules; row += 1) {
          for (let column = 0; column < modules; column += 1) {
            if (qr.isDark(row, column)) context.fillRect((column + quietZone) * scale, (row + quietZone) * scale, scale, scale);
          }
        }
        wifiTool.querySelector("[data-qr-network]").textContent = ssid;
        placeholder.hidden = true;
        output.hidden = false;
        error.hidden = true;
      } catch {
        error.textContent = "That network name or password is too long to fit in a QR code.";
        error.hidden = false;
      }
    });

    wifiTool.querySelector("[data-download-qr]").addEventListener("click", () => {
      const link = document.createElement("a");
      const safeName = form.elements.ssid.value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "wifi";
      link.download = `${safeName}-wifi-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
    updateSecurity();
  }
})();
