# ens-bulk-check

Check a list of `.eth` names. ENS opens one name at a time. Up to 40 are read from the Ethereum registrar in one pass: registered, grace, premium, or available, plus owner, expiry, and the live one-year price.

Read-only. No wallet.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:38471](http://127.0.0.1:38471).

Names work with the public Ethereum RPC. An optional `ETH_RPC_URL` in `.env.local` is tried first.

## Test

```bash
npm test
```

## Interface

The interface uses [RetroUI](https://retroui.dev) (NeoBrutalism) components under the MIT license. The notice is in `licenses/retroui/LICENCE.md` and in each copied source file.

## License

The code is [MIT](LICENSE) licensed. Copyright (c) 2026 Nicolaj Hasberg.

RetroUI components under `src/components/retroui` stay Copyright (c) 2024 Arif Hossain, also MIT.
