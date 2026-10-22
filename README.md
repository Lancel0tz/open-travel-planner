# Open Travel Planner

## Deploy with Docker Compose

1. Install Docker Engine and the Docker Compose plugin.
2. Clone the repository and enter its directory:

   ```sh
   git clone https://github.com/Lancel0tz/open-travel-planner.git
   cd open-travel-planner
   ```

3. Create the local environment file and generate an encryption key:

   ```sh
   cp .env.example .env
   openssl rand -hex 32
   ```

   Put the generated value in `.env` as `ENCRYPTION_KEY`. Keep `.env` private and back up the key securely. Encrypted settings cannot be recovered without it.

4. Build and start the service:

   ```sh
   docker compose up -d --build
   ```

5. Open <http://localhost:3000> and create the first user. Application data is stored in `./data` and uploaded files in `./uploads`.

To update after pulling new source:

```sh
git pull
docker compose up -d --build
```

To stop the service while keeping its data:

```sh
docker compose down
```

## Deploy with Render

1. In Render, choose **New → Blueprint** and connect this repository.
2. Review the service configuration from `render.yaml`.
3. Before first use, set `ENCRYPTION_KEY` in the service's environment settings to a unique value generated with `openssl rand -hex 32`.
4. Deploy, open the service URL, and create the first user.

The blueprint provisions a 1 GB persistent disk at `/app/data`. Back up important data separately.
