FROM mariadb

COPY ./signups.sql /docker-entrypoint-initdb.d/signups.sql
COPY ./templates.sql /docker-entrypoint-initdb.d/templates.sql
COPY ./schedule.sql /docker-entrypoint-initdb.d/schedule.sql