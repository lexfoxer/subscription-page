## Remnawave Subscription Page

Learn more about Remnawave [here](https://docs.rw/).

## Self-service settings page

This fork adds an optional settings page at `/<shortUuid>/settings` (a gear icon in the header
leads to it). It lets the subscriber do two things without contacting support:

- **Pick an external squad**. With `EXTERNAL_SQUADS_SELECTABLE=auto` the list is managed right
  in the Remnawave dashboard: a squad named `[ios,macos] Apple servers` becomes selectable and is
  recommended on those platforms, `[all] …` suits any device, squads without a `[tags]` prefix
  stay hidden. Alternatively the variable takes an explicit JSON list of squads. Remnawave allows
  a single external squad per user, so the choice applies to the whole subscription.
- **Reset the traffic counter** a limited number of times per calendar month
  (`TRAFFIC_RESET_LIMIT_PER_MONTH`). The history is stored in a SQLite file under `DATA_DIR`, so
  mount a volume there (see `docker-compose-prod.yml`).

Both actions are performed through the Remnawave API with the page's own token and are bound to
the subscription the page was opened with (the session cookie carries the user identity). See
`.env.sample` for the full list of variables.

### Building a fork

`.github/workflows/ghcr-fork.yml` builds a multi-arch image on every push to `main` or a tag and
publishes it to `ghcr.io/<owner>/subscription-page` using the built-in `GITHUB_TOKEN`, so no
secrets are required. The first push creates the package as private: open the package settings on
GitHub and either make it public or `docker login ghcr.io` on the server with a token that has the
`read:packages` scope. The upstream workflows (`build-and-push*.yml`) need Docker Hub and Telegram
secrets and can be disabled in the fork's Actions tab.

Step-by-step (fork remotes, GHCR, docker-compose, env) in Russian: [docs/FORK_AND_DEPLOY.md](docs/FORK_AND_DEPLOY.md).

# Contributors

Check [open issues](https://github.com/remnawave/subscription-page/issues) to help the progress of this project.

<p align="center">
Thanks to the all contributors who have helped improve Remnawave:
</p>
<p align="center">
<a href="https://github.com/remnawave/subscription-page/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=remnawave/subscription-page" />
</a>
</p>
