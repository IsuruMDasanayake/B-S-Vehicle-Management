<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    protected ?WebPush $webPush = null;

    public function __construct()
    {
        $subject = config('webpush.vapid.subject', env('VAPID_SUBJECT', 'mailto:admin@circleengineering.lk'));
        $publicKey = config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY'));
        $privateKey = config('webpush.vapid.private_key', env('VAPID_PRIVATE_KEY'));

        if ($publicKey && $privateKey) {
            try {
                $this->webPush = new WebPush([
                    'VAPID' => [
                        'subject'    => $subject,
                        'publicKey'  => $publicKey,
                        'privateKey' => $privateKey,
                    ],
                ]);
                $this->webPush->setReuseVapidHeaders(true);
            } catch (\Throwable $e) {
                Log::error('WebPushService initialization failed: ' . $e->getMessage());
                $this->webPush = null;
            }
        } else {
            Log::warning('WebPushService: VAPID keys not found in config or .env');
        }
    }

    /**
     * Send push notification to users
     *
     * @param mixed $users User model, Collection, array of users/IDs, or single user ID
     * @param array $payload ['title', 'body'|'message', 'link'|'url', 'category', 'icon', 'badge', 'severity', 'source_id']
     */
    public function sendToUsers($users, array $payload): array
    {
        if (!$this->webPush) {
            Log::warning('WebPushService: WebPush instance not ready (missing keys)');
            return ['success' => false, 'sent' => 0, 'failed' => 0];
        }

        $userIds = [];
        if ($users instanceof Collection) {
            $userIds = $users->pluck('id')->filter()->unique()->all();
        } elseif (is_array($users)) {
            foreach ($users as $u) {
                if ($u instanceof User) {
                    $userIds[] = $u->id;
                } elseif (is_numeric($u)) {
                    $userIds[] = (int) $u;
                }
            }
            $userIds = array_values(array_unique($userIds));
        } elseif ($users instanceof User) {
            $userIds = [$users->id];
        } elseif (is_numeric($users)) {
            $userIds = [(int) $users];
        }

        if (empty($userIds)) {
            return ['success' => true, 'sent' => 0, 'failed' => 0];
        }

        $subscriptions = PushSubscription::whereIn('user_id', $userIds)->get();
        if ($subscriptions->isEmpty()) {
            return ['success' => true, 'sent' => 0, 'failed' => 0, 'message' => 'No push subscriptions found for target user(s)'];
        }

        $title = $payload['title'] ?? 'HR Notification';
        $body = $payload['body'] ?? $payload['message'] ?? 'You have a new HR notification.';
        $url = $payload['url'] ?? $payload['link'] ?? '/solar/hr/admin/dashboard';
        $category = $payload['category'] ?? 'general';
        $severity = $payload['severity'] ?? 'info';

        $pushData = json_encode([
            'title'    => $title,
            'body'     => $body,
            'icon'     => $payload['icon'] ?? '/favicon.svg',
            'badge'    => $payload['badge'] ?? '/favicon.svg',
            'tag'      => 'hr-' . ($payload['source_id'] ?? uniqid()),
            'url'      => $url,
            'data'     => [
                'url'       => $url,
                'category'  => $category,
                'severity'  => $severity,
                'source_id' => $payload['source_id'] ?? null,
                'timestamp' => now()->timestamp,
            ],
        ]);

        $subMap = [];
        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->public_key,
                    'authToken'       => $sub->auth_token,
                    'contentEncoding' => $sub->content_encoding ?? 'aesgcm',
                ]);
                $this->webPush->queueNotification($subscription, $pushData);
                $subMap[$sub->endpoint] = $sub;
            } catch (\Throwable $e) {
                Log::warning("WebPushService: Failed queuing push for sub ID {$sub->id}: " . $e->getMessage());
            }
        }

        $sentCount = 0;
        $failedCount = 0;
        $staleEndpoints = [];

        try {
            foreach ($this->webPush->flush() as $report) {
                $endpoint = $report->getEndpoint();
                if ($report->isSuccess()) {
                    $sentCount++;
                } else {
                    $failedCount++;
                    Log::warning("WebPush failed for {$endpoint}: " . $report->getReason());
                    if ($report->isSubscriptionExpired()) {
                        $staleEndpoints[] = $endpoint;
                    }
                }
            }

            if (!empty($staleEndpoints)) {
                PushSubscription::whereIn('endpoint', $staleEndpoints)->delete();
                Log::info("WebPushService: Deleted " . count($staleEndpoints) . " expired subscriptions.");
            }
        } catch (\Throwable $e) {
            Log::error('WebPushService flush failed: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'sent'    => $sentCount,
            'failed'  => $failedCount,
        ];
    }
}
