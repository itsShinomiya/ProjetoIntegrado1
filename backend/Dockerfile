FROM python:3.11-slim

WORKDIR /app

# Dependências do sistema para o psycopg2 (driver do postgres)
RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["flask", "run", "--host=0.0.0.0"]