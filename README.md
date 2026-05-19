
  # Credit Card Sentiment Analysis App

  This is a code bundle for Credit Card Sentiment Analysis App. The original project is available at https://www.figma.com/design/R5SV1dy8BFBvdAlEiF2EpC/Credit-Card-Sentiment-Analysis-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `node server.js` in one terminal and `npm run dev` in another to start the development servers.

  ## Databricks App Deployment

  This UI now reads live data from Databricks SQL through `server.js`.

  Required env vars for the app runtime:
  - `DATABRICKS_SERVER_HOSTNAME`
  - `DATABRICKS_HTTP_PATH`
  - `DATABRICKS_TOKEN`

  Optional table overrides:
  - `DASHBOARD_GOLD_TABLE`
  - `DASHBOARD_SILVER_TABLE`

  Databricks App start command is defined in `app.yaml` and runs both API and Vite frontend.
  You can also populate `config/runtime_config.json` for local non-secret defaults.
  