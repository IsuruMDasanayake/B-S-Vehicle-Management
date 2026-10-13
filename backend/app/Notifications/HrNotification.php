<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HrNotification extends Notification
{
    use Queueable;

    public array $data;

    /**
     * @param array $data [
     *   'division'   => 'hr',
     *   'category'   => 'leave' | 'attendance' | 'compliance' | 'general',
     *   'title'      => string,
     *   'message'    => string,
     *   'severity'   => 'info' | 'warning' | 'danger' | 'success',
     *   'link'       => string,
     *   'source_id'  => int|string|null,
     *   'meta'       => array
     * ]
     */
    public function __construct(array $data)
    {
        $this->data = array_merge([
            'division' => 'hr',
            'category' => 'general',
            'severity' => 'info',
            'link'     => '/solar/hr/admin/dashboard',
        ], $data);
    }

    public function via(object $notifiable): array
    {
        return ['database', \App\Channels\WebPushChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }

    public function toWebPush(object $notifiable): array
    {
        return [
            'title'     => $this->data['title'] ?? 'HR Alert',
            'body'      => $this->data['message'] ?? '',
            'url'       => $this->data['link'] ?? '/solar/hr/admin/dashboard',
            'category'  => $this->data['category'] ?? 'general',
            'severity'  => $this->data['severity'] ?? 'info',
            'source_id' => $this->data['source_id'] ?? null,
            'icon'      => '/favicon.svg',
            'badge'     => '/favicon.svg',
        ];
    }
}
