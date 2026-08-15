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

  const vlanTool = document.querySelector("[data-vlan-tool]");
  if (vlanTool) {
    const form = vlanTool.querySelector("[data-vlan-form]");
    const rows = vlanTool.querySelector("[data-vlan-rows]");
    const error = vlanTool.querySelector("[data-vlan-error]");
    const output = vlanTool.querySelector("[data-plan-body]");
    const title = vlanTool.querySelector("[data-plan-title]");
    const summary = vlanTool.querySelector("[data-plan-summary]");
    let plan = [];

    const parseCidr = (value) => {
      const pieces = value.trim().split("/");
      const ip = pieces.length === 2 ? parseIp(pieces[0]) : null;
      const prefix = Number(pieces[1]);
      if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 30) throw new Error("Enter a valid parent network in IPv4 CIDR notation, such as 10.20.0.0/20.");
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return { network: (ip & mask) >>> 0, prefix, size: 2 ** (32 - prefix) };
    };

    const collectRequirements = () => {
      const requirements = [...rows.querySelectorAll("[data-vlan-row]")].map((row, index) => {
        const name = row.querySelector('[name="vlanName"]').value.trim();
        const vlan = Number(row.querySelector('[name="vlanId"]').value);
        const hosts = Number(row.querySelector('[name="hosts"]').value);
        if (!name) throw new Error(`Enter a name for requirement ${index + 1}.`);
        if (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094) throw new Error(`VLAN ID for ${name} must be a whole number from 1 to 4094.`);
        if (!Number.isInteger(hosts) || hosts < 1 || hosts > 1073741822) throw new Error(`Required hosts for ${name} must be a positive whole number.`);
        const blockSize = 2 ** Math.ceil(Math.log2(hosts + 2));
        return { name, vlan, hosts, blockSize, prefix: 32 - Math.log2(blockSize) };
      });
      if (new Set(requirements.map((item) => item.vlan)).size !== requirements.length) throw new Error("Each VLAN ID must be unique.");
      return requirements.sort((a, b) => b.blockSize - a.blockSize || a.vlan - b.vlan);
    };

    const buildPlan = () => {
      const parent = parseCidr(form.elements.parent.value);
      const requirements = collectRequirements();
      const parentEnd = parent.network + parent.size - 1;
      let cursor = parent.network;
      plan = requirements.map((item) => {
        const network = Math.ceil(cursor / item.blockSize) * item.blockSize;
        const broadcast = network + item.blockSize - 1;
        if (broadcast > parentEnd) throw new Error(`The requirements do not fit inside ${toIp(parent.network)}/${parent.prefix}. Use a larger parent network or reduce the host counts.`);
        const mask = item.prefix === 0 ? 0 : (0xffffffff << (32 - item.prefix)) >>> 0;
        cursor = broadcast + 1;
        return { ...item, network, broadcast, mask, first: network + 1, last: broadcast - 1, capacity: item.blockSize - 2 };
      });
      title.textContent = `${toIp(parent.network)}/${parent.prefix}`;
      output.replaceChildren(...plan.map((item) => {
        const row = document.createElement("tr");
        [item.vlan, item.name, `${toIp(item.network)}/${item.prefix}`, toIp(item.mask), `${toIp(item.first)} – ${toIp(item.last)}`, item.capacity.toLocaleString("en-GB")].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        return row;
      }));
      const used = plan.reduce((total, item) => total + item.blockSize, 0);
      summary.textContent = `${plan.length} VLAN${plan.length === 1 ? "" : "s"} allocated · ${used.toLocaleString("en-GB")} of ${parent.size.toLocaleString("en-GB")} addresses reserved · ${(parent.size - used).toLocaleString("en-GB")} addresses remain.`;
    };

    const safeCsvCell = (value) => {
      const text = String(value);
      const protectedValue = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${protectedValue.replace(/"/g, '""')}"`;
    };
    const planCsv = () => ["VLAN,Name,Subnet,Mask,First usable,Last usable,Broadcast,Capacity", ...plan.map((item) => [item.vlan, safeCsvCell(item.name), `${toIp(item.network)}/${item.prefix}`, toIp(item.mask), toIp(item.first), toIp(item.last), toIp(item.broadcast), item.capacity].join(","))].join("\n");
    vlanTool.querySelector("[data-add-vlan]").addEventListener("click", () => rows.append(vlanTool.querySelector("[data-vlan-template]").content.cloneNode(true)));
    rows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-vlan]");
      if (!button) return;
      if (rows.querySelectorAll("[data-vlan-row]").length === 1) { error.textContent = "The plan needs at least one VLAN requirement."; error.hidden = false; return; }
      button.closest("[data-vlan-row]").remove();
    });
    form.addEventListener("submit", (event) => { event.preventDefault(); try { buildPlan(); error.hidden = true; } catch (problem) { error.textContent = problem.message; error.hidden = false; } });
    vlanTool.querySelector("[data-copy-plan]").addEventListener("click", async (event) => {
      try { await navigator.clipboard.writeText(planCsv()); event.currentTarget.textContent = "Copied"; window.setTimeout(() => { event.currentTarget.textContent = "Copy CSV"; }, 1600); } catch { event.currentTarget.textContent = "Copy unavailable"; }
    });
    vlanTool.querySelector("[data-download-plan]").addEventListener("click", () => {
      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(new Blob([planCsv()], { type: "text/csv;charset=utf-8" }));
      link.download = "vlan-subnet-plan.csv"; link.href = objectUrl; link.click(); URL.revokeObjectURL(objectUrl);
    });
    buildPlan();
  }

  const dnsTool = document.querySelector("[data-dns-tool]");
  if (dnsTool) {
    const form = dnsTool.querySelector("[data-dns-form]");
    const type = form.elements.type;
    const fields = dnsTool.querySelector("[data-dns-fields]");
    const error = dnsTool.querySelector("[data-dns-error]");
    const list = dnsTool.querySelector("[data-dns-records]");
    const empty = dnsTool.querySelector("[data-dns-empty]");
    let records = [];
    const fieldMarkup = {
      A: '<div class="field-group"><label for="dns-value">IPv4 address</label><input id="dns-value" name="value" value="192.0.2.10" placeholder="192.0.2.10"></div>',
      AAAA: '<div class="field-group"><label for="dns-value">IPv6 address</label><input id="dns-value" name="value" value="2001:db8::10" placeholder="2001:db8::10"></div>',
      CNAME: '<div class="field-group"><label for="dns-target">Canonical target</label><input id="dns-target" name="target" value="app.example.com." placeholder="target.example.com."><p class="field-hint">A trailing dot marks a fully qualified domain name.</p></div>',
      MX: '<div class="dns-field-pair"><div class="field-group"><label for="dns-priority">Priority</label><input id="dns-priority" name="priority" type="number" min="0" max="65535" value="10"></div><div class="field-group"><label for="dns-target">Mail server</label><input id="dns-target" name="target" value="mail.example.com." placeholder="mail.example.com."></div></div>',
      TXT: '<div class="field-group"><label for="dns-value">Text value</label><textarea id="dns-value" name="value" rows="4" placeholder="v=spf1 include:example.com ~all">v=spf1 include:example.com ~all</textarea><p class="field-hint">Quotes and backslashes are escaped in the generated record.</p></div>',
      SRV: '<div class="dns-field-pair four"><div class="field-group"><label for="dns-priority">Priority</label><input id="dns-priority" name="priority" type="number" min="0" max="65535" value="10"></div><div class="field-group"><label for="dns-weight">Weight</label><input id="dns-weight" name="weight" type="number" min="0" max="65535" value="5"></div><div class="field-group"><label for="dns-port">Port</label><input id="dns-port" name="port" type="number" min="1" max="65535" value="443"></div><div class="field-group"><label for="dns-target">Target</label><input id="dns-target" name="target" value="service.example.com." placeholder="service.example.com."></div></div>'
    };
    const validDnsLabel = (label, allowUnderscore) => {
      const normalized = allowUnderscore && label.startsWith("_") ? label.slice(1) : label;
      const allowedCharacters = allowUnderscore ? /^[a-z0-9_-]+$/i : /^[a-z0-9-]+$/i;
      return normalized.length > 0 && normalized.length <= 63 && /^[a-z0-9]$/i.test(normalized[0]) && /^[a-z0-9]$/i.test(normalized.at(-1)) && allowedCharacters.test(normalized);
    };
    const validDnsLabels = (value, allowUnderscore = false) => {
      const withoutTrailingDot = value.endsWith(".") ? value.slice(0, -1) : value;
      return withoutTrailingDot.length > 0 && withoutTrailingDot.length <= 253 && withoutTrailingDot.split(".").every((label) => validDnsLabel(label, allowUnderscore));
    };
    const validName = (value) => value === "@" || validDnsLabels(value.startsWith("*.") ? value.slice(2) : value, true);
    const validTarget = (value) => validDnsLabels(value);
    const validIpv6 = (value) => /^[0-9a-f:]+$/i.test(value) && value.includes(":") && (value.match(/::/g) || []).length <= 1 && value.split(":").filter(Boolean).every((part) => part.length <= 4) && (value.includes("::") ? value.split(":").filter(Boolean).length < 8 : value.split(":").length === 8);
    const numberField = (name, label, min = 0, max = 65535) => { const value = Number(form.elements[name].value); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`); return value; };
    const renderFields = () => { fields.innerHTML = fieldMarkup[type.value]; };
    const renderRecords = () => {
      empty.hidden = records.length > 0;
      list.replaceChildren(...records.map((record, index) => {
        const item = document.createElement("li"); item.className = "dns-record";
        const content = document.createElement("div"); const code = document.createElement("code"); const note = document.createElement("p");
        code.textContent = record.line; note.textContent = record.note; content.append(code, note);
        const remove = document.createElement("button"); remove.type = "button"; remove.dataset.removeDns = index; remove.setAttribute("aria-label", `Remove ${record.type} record`); remove.textContent = "×";
        item.append(content, remove); return item;
      }));
    };
    const buildRecord = () => {
      const recordType = type.value; const name = form.elements.name.value.trim(); const ttl = numberField("ttl", "Time to live", 0, 2147483647);
      if (!validName(name)) throw new Error("Enter a valid record name, host label or @ for the zone apex.");
      let data = ""; let note = "";
      if (recordType === "A") { const value = form.elements.value.value.trim(); if (parseIp(value) === null) throw new Error("Enter a valid IPv4 address."); data = value; note = "Maps a name to an IPv4 address."; }
      if (recordType === "AAAA") { const value = form.elements.value.value.trim(); if (!validIpv6(value)) throw new Error("Enter a valid IPv6 address."); data = value; note = "Maps a name to an IPv6 address."; }
      if (recordType === "CNAME") { const target = form.elements.target.value.trim(); if (!validTarget(target)) throw new Error("Enter a valid canonical target name."); data = target; note = "Aliases this name to the canonical target."; }
      if (recordType === "MX") { const priority = numberField("priority", "Priority"); const target = form.elements.target.value.trim(); if (!validTarget(target)) throw new Error("Enter a valid mail server name."); data = `${priority} ${target}`; note = "Routes mail to the target; lower priority values are preferred."; }
      if (recordType === "TXT") { const value = form.elements.value.value.trim(); if (!value) throw new Error("Enter a text value."); data = `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`; note = "Publishes text such as ownership, SPF or verification information."; }
      if (recordType === "SRV") { const priority = numberField("priority", "Priority"); const weight = numberField("weight", "Weight"); const port = numberField("port", "Port", 1); const target = form.elements.target.value.trim(); if (!validTarget(target)) throw new Error("Enter a valid service target name."); data = `${priority} ${weight} ${port} ${target}`; note = "Advertises the location, port and selection order for a service."; }
      return { type: recordType, line: `${name} ${ttl} IN ${recordType} ${data}`, note };
    };
    type.addEventListener("change", renderFields);
    form.addEventListener("submit", (event) => { event.preventDefault(); try { records.push(buildRecord()); renderRecords(); error.hidden = true; } catch (problem) { error.textContent = problem.message; error.hidden = false; } });
    list.addEventListener("click", (event) => { const button = event.target.closest("[data-remove-dns]"); if (!button) return; records.splice(Number(button.dataset.removeDns), 1); renderRecords(); });
    dnsTool.querySelector("[data-copy-dns]").addEventListener("click", async (event) => { if (!records.length) return; try { await navigator.clipboard.writeText(records.map((record) => record.line).join("\n")); event.currentTarget.textContent = "Copied"; window.setTimeout(() => { event.currentTarget.textContent = "Copy all"; }, 1600); } catch { event.currentTarget.textContent = "Copy unavailable"; } });
    dnsTool.querySelector("[data-clear-dns]").addEventListener("click", () => { records = []; renderRecords(); });
    renderFields(); renderRecords();
  }

  const macTool = document.querySelector("[data-mac-tool]");
  if (macTool) {
    const form = macTool.querySelector("[data-mac-form]");
    const error = macTool.querySelector("[data-mac-error]");
    const submit = macTool.querySelector("[data-mac-submit]");
    const vendor = macTool.querySelector("[data-mac-vendor]");
    const address = macTool.querySelector("[data-mac-address]");
    const status = macTool.querySelector("[data-mac-status]");
    const note = macTool.querySelector("[data-mac-note]");

    const normalizeMac = (value) => {
      const clean = value.trim().toUpperCase().replace(/[\s:./-]/g, "");
      if (!/^(?:[0-9A-F]{6}|[0-9A-F]{12})$/.test(clean)) throw new Error("Enter exactly 6 or 12 hexadecimal characters.");
      return clean.match(/.{2}/g).join(":");
    };

    const localClassification = (normalised) => {
      const firstOctet = Number.parseInt(normalised.slice(0, 2), 16);
      if (normalised === "FF:FF:FF:FF:FF:FF") return { status: "Broadcast", note: "The broadcast address does not belong to a hardware vendor." };
      if ((firstOctet & 1) === 1) return { status: "Multicast", note: "Multicast addresses do not identify an individual hardware vendor." };
      if ((firstOctet & 2) === 2) return { status: "Locally administered", note: "This address is locally administered or randomised, so its prefix is not a globally registered vendor identifier." };
      return null;
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.hidden = true;
      let normalised;
      try {
        normalised = normalizeMac(form.elements.mac.value);
      } catch (problem) {
        error.textContent = problem.message;
        error.hidden = false;
        form.elements.mac.focus();
        return;
      }

      form.elements.mac.value = normalised;
      address.textContent = normalised;
      const classification = localClassification(normalised);
      if (classification) {
        vendor.textContent = "Not applicable";
        status.textContent = classification.status;
        note.textContent = classification.note;
        return;
      }

      submit.disabled = true;
      submit.textContent = "Looking up…";
      vendor.textContent = "Searching…";
      status.textContent = "In progress";
      note.textContent = "Contacting the vendor database.";
      try {
        const response = await fetch(`${macTool.dataset.apiEndpoint}?mac=${encodeURIComponent(normalised)}`, { headers: { Accept: "application/json" } });
        const result = await response.json().catch(() => null);
        if (!result || typeof result.status !== "string") throw new Error("The lookup service returned an unexpected response.");
        if (response.ok && result.status === "found") {
          vendor.textContent = result.vendor;
          status.textContent = "Vendor found";
          note.textContent = "The vendor is derived from the registered MAC address prefix.";
        } else if (response.status === 404 && result.status === "not_found") {
          vendor.textContent = "Not found";
          status.textContent = "No registration found";
          note.textContent = "MACVendors has no registered vendor for this address prefix.";
        } else if (response.status === 429) {
          throw new Error("The lookup service is busy. Please wait a moment and try again.");
        } else {
          throw new Error(result.message || "The vendor lookup could not be completed.");
        }
      } catch (problem) {
        vendor.textContent = "Lookup unavailable";
        status.textContent = "Error";
        note.textContent = "No vendor result was returned.";
        error.textContent = problem instanceof TypeError ? "The lookup service could not be reached. Please try again shortly." : problem.message;
        error.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = "Look up vendor";
      }
    });
  }
})();
