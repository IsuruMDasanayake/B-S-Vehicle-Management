FROM php:8.3-fpm-alpine

# ─── System Dependencies ──────────────────────────────────────────────────────
RUN apk add --no-cache \
    $PHPIZE_DEPS \
    linux-headers \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    libxml2-dev \
    icu-dev \
    libzip-dev \
    nodejs \
    npm

# ─── PHP Extensions ───────────────────────────────────────────────────────────
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        intl \
        zip \
        opcache

# ─── Redis Extension ─────────────────────────────────────────────────────────
RUN pecl install redis && docker-php-ext-enable redis

# ─── Composer ─────────────────────────────────────────────────────────────────
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# ─── Working Directory ────────────────────────────────────────────────────────
WORKDIR /var/www/html

# ─── Copy Application ─────────────────────────────────────────────────────────
COPY . .

# ─── Install Dependencies ─────────────────────────────────────────────────────
RUN composer install --no-dev --optimize-autoloader --no-interaction 2>/dev/null || true

# ─── Permissions ──────────────────────────────────────────────────────────────
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache 2>/dev/null || true

# ─── PHP Config ───────────────────────────────────────────────────────────────
RUN echo "upload_max_filesize=500M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "post_max_size=500M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "memory_limit=512M" >> /usr/local/etc/php/conf.d/custom.ini

EXPOSE 9000
CMD ["php-fpm"]
