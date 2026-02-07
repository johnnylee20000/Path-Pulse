# Run Path-Pulse on Your Tab 9 (or any phone/tablet)

Use the **web app** in the tablet’s browser. Same Wi‑Fi as your PC required.

---

## Step 1: Start the server on your PC

In Cursor’s terminal (or PowerShell), run:

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web"
python -m http.server 8080
```

Leave this window open (server must keep running).

---

## Step 2: Connect Tab 9 to the same Wi‑Fi

On your Tab 9, connect to the **same Wi‑Fi network** as your PC (not mobile data).

---

## Step 3: Find your PC’s IP address

On your **PC**, in a new terminal run:

```powershell
ipconfig
```

Under your **Wi‑Fi** adapter, note **IPv4 Address** (e.g. `192.168.1.144`).

---

## Step 4: Open the app on your Tab 9

1. On the **Tab 9**, open **Chrome** (or Samsung Internet / any browser).
2. In the address bar type (use your PC’s IP from step 3):

   **http://192.168.1.144:8080/index.html**

   Example: if your IP is `192.168.1.144`, open:
   **http://192.168.1.144:8080/index.html**

3. Tap **Go**.
4. When the browser asks for **location**, tap **Allow** (needed for Map and expedition).
5. Accept the Explorer’s Oath and use the app (Map, Home, Profile).

---

## Optional: Add to home screen (like an app)

In Chrome on the Tab 9:

1. Open **http://YOUR_PC_IP:8080/index.html** (as above).
2. Tap the **⋮** menu → **Add to Home screen** (or **Install app**).
3. Name it “Path-Pulse” and confirm.

You’ll get a home-screen icon that opens the app in a browser window (your PC must be on the same Wi‑Fi and the server must be running).

---

## If the page doesn’t load on the Tab 9

- Check Tab 9 is on the **same Wi‑Fi** as the PC.
- Check the server is still running on the PC (terminal window open).
- On the PC, allow port 8080 through Windows Firewall (PowerShell as Administrator):

  ```powershell
  netsh advfirewall firewall add rule name="Path-Pulse Dev" dir=in action=allow protocol=TCP localport=8080
  ```

Then try **http://YOUR_PC_IP:8080/index.html** again on the Tab 9.
