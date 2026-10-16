# Форк, сборка в GHCR и запуск в docker-compose

Инструкция для своего форка `remnawave/subscription-page` с страницей настроек
(выбор внешнего сквада и сброс трафика).

## 1. Подключить локальный репозиторий к форку

Сначала создайте форк на GitHub: откройте
<https://github.com/remnawave/subscription-page>, нажмите **Fork** и выберите свой аккаунт.
Дальше `<user>` — это ваш логин на GitHub.

Текущий `origin` смотрит на апстрим, поэтому переименуйте его в `upstream`, а форк сделайте
`origin`:

```bash
git remote rename origin upstream
```

```bash
git remote add origin git@github.com:<user>/subscription-page.git
```

Если используете HTTPS вместо SSH, адрес будет `https://github.com/<user>/subscription-page.git`.

Проверка:

```bash
git remote -v
```

Должно получиться: `origin` → ваш форк, `upstream` → `remnawave/subscription-page`.

Закоммитьте изменения и отправьте ветку в форк:

```bash
git add -A && git commit -m "feat: self-service settings page (external squads, traffic reset)"
```

```bash
git push -u origin main
```

Чтобы потом подтягивать обновления апстрима:

```bash
git fetch upstream && git merge upstream/main
```

## 2. Сборка образа в GitHub Container Registry

Workflow `.github/workflows/ghcr-fork.yml` запускается сам при пуше в `main` и при пуше тега.
Ему не нужны секреты: он использует встроенный `GITHUB_TOKEN` и публикует образ как
`ghcr.io/<user>/subscription-page`.

Теги образа:

| Событие | Теги |
| --- | --- |
| push в `main` | `latest`, `main`, `sha-<короткий хеш>` |
| push тега `8.1.0` | `8.1.0`, `8.1`, `latest` |

Выпуск версии:

```bash
git tag 8.1.0 && git push origin 8.1.0
```

После первой сборки пакет появится в **Profile → Packages → subscription-page**. Он наследует
видимость репозитория: у публичного форка образ публичный и тянется без логина. Для приватного
форка на сервере нужен один раз вход с токеном (classic PAT со scope `read:packages`):

```bash
echo "<PAT>" | docker login ghcr.io -u <user> --password-stdin
```

Апстримные workflow `build-and-push.yml` и `build-and-push-dev.yml` в форке будут падать
(им нужны секреты Docker Hub и Telegram). Отключите их во вкладке **Actions → workflow → ⋯ →
Disable workflow** или удалите файлы.

Если форк приватный, job `linux/arm64` на раннере `ubuntu-24.04-arm` может быть недоступен:
удалите этот элемент матрицы в workflow или соберите arm64 через QEMU.

## 3. Запуск в docker-compose

На сервере, рядом с остальной инсталляцией Remnawave:

```bash
mkdir -p /opt/remnawave/subscription-page && cd /opt/remnawave/subscription-page
```

Создайте `docker-compose.yml`:

```yaml
services:
  remnawave-subscription-page:
    image: ghcr.io/<user>/subscription-page:latest
    container_name: remnawave-subscription-page
    hostname: remnawave-subscription-page
    restart: always
    env_file:
      - .env
    ports:
      - '127.0.0.1:3010:3010'
    volumes:
      # история сбросов трафика (SQLite); без volume счётчик обнулится при пересоздании контейнера
      - ./data:/opt/app/data
    networks:
      - remnawave-network

networks:
  remnawave-network:
    driver: bridge
    external: true
```

Сеть `remnawave-network` создаётся основным compose-файлом Remnawave. Если панель живёт на
другом хосте, уберите секцию `networks` и укажите в `REMNAWAVE_PANEL_URL` публичный адрес панели.

Создайте `.env` (полный список переменных с комментариями — в `.env.sample`):

```dotenv
APP_PORT=3010

# адрес панели внутри docker-сети или публичный https-адрес
REMNAWAVE_PANEL_URL=http://remnawave:3000
# Remnawave Dashboard → Remnawave Settings → API Tokens
REMNAWAVE_API_TOKEN=<токен>

# если страница отдаётся по пути /sub/<shortUuid>
CUSTOM_SUB_PREFIX=
TRUST_PROXY=1

# --- страница настроек ---
# сколько раз в месяц пользователь может сам сбросить трафик (0 = выключено)
TRAFFIC_RESET_LIMIT_PER_MONTH=3
# где хранить историю сбросов (совпадает с volume выше)
DATA_DIR=/opt/app/data
# внешние сквады выбираются по именам в панели (см. ниже)
EXTERNAL_SQUADS_SELECTABLE=auto
# разрешить вернуться к варианту «по умолчанию» (без внешнего сквада)
EXTERNAL_SQUADS_ALLOW_DEFAULT=false
```

### Какие сквады видит пользователь

В режиме `auto` список управляется из панели, через имена сквадов в
**Dashboard → External Squads**. Панель разрешает в имени только буквы, цифры, дефис,
подчёркивание и пробел, поэтому маркер — первое слово `pub`, к которому через дефис
дописываются платформы. Маркер пользователю не показывается:

| Имя сквада в панели | Что увидит пользователь |
| --- | --- |
| `pub-ios-macos-appletv Apple servers` | «Apple servers», рекомендуется на iPhone, Mac, Apple TV |
| `pub-android-windows-linux Fast` | «Fast», рекомендуется на Android, Windows, Linux |
| `pub-all Все серверы` или `pub Все серверы` | «Все серверы», подходит любому устройству |
| `Internal` | не показывается, нет маркера `pub` |

Теги: `ios`, `android`, `macos` (или `mac`), `windows` (`win`), `linux`, `androidtv` (`atv`),
`appletv` (`tvos`), `all`. Регистр не важен, вместо дефиса можно подчёркивание. Список
обновляется сам, не позднее чем через минуту после переименования.

Если имена сквадов трогать нельзя, вместо `auto` можно задать явный JSON-список в одну строку:

```dotenv
EXTERNAL_SQUADS_SELECTABLE=[{"uuid":"<uuid-1>","platforms":["ios","macos","appleTV"],"label":"Apple"},{"uuid":"<uuid-2>","platforms":["android","windows","linux"]}]
```

Поля `platforms` и `label` необязательны: без платформ сквад подходит всем, без `label`
показывается имя из панели.

Запуск:

```bash
docker compose pull && docker compose up -d
```

Проверка логов. В начале должна быть строка `[CONFIG] Account settings page: enabled ...` и
`[OK] Traffic reset storage: /opt/app/data/subpage.sqlite`:

```bash
docker compose logs -f --tail 50
```

Обновление после новой сборки:

```bash
docker compose pull && docker compose up -d
```

Reverse proxy (Caddy, nginx, Traefik) настраивается так же, как для оригинальной страницы:
приложение требует заголовки `X-Forwarded-For` и `X-Forwarded-Proto: https`.

## 4. Что увидит пользователь

- В шапке страницы подписки появляется шестерёнка, если включена хотя бы одна функция.
- `/<shortUuid>/settings` — страница с двумя блоками: «Группа серверов» (внешние сквады с
  пометкой «рекомендуется» для определённой платформы) и «Сброс трафика» (счётчик
  `осталось N из M`, лимит обновляется 1-го числа месяца по UTC).
- Все действия идут через API страницы с httpOnly-cookie сессии и привязаны к той подписке,
  с которой открыта страница.
