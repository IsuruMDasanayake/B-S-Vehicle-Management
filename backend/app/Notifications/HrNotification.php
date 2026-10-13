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
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
