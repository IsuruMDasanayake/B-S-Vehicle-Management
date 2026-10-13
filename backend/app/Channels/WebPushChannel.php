<?php

namespace App\Channels;

use App\Services\WebPushService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class WebPushChannel
{
    public function __construct(
        protected WebPushService $webPushService
    ) {}

    /**
     * Send the given notification via Web Push.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        try {
            $payload = [];

            if (method_exists($notification, 'toWebPush')) {
                $payload = $notification->toWebPush($notifiable);
            } elseif (method_exists($notification, 'toArray')) {
                $payload = $notification->toArray($notifiable);
            } elseif (isset($notification->data) && is_array($notification->data)) {
                $payload = $notification->data;
            }

            if (empty($payload)) {
                return;
            }

            $this->webPushService->sendToUsers($notifiable, $payload);
        } catch (\Throwable $e) {
            Log::error('WebPushChannel send error: ' . $e->getMessage());
        }
    }
}
