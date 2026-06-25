<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class SystemAlertNotification extends Notification
{
    use Queueable;

    public $alertData;

    public function __construct(array $alertData)
    {
        $this->alertData = $alertData;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->alertData['title'] ?? 'System Alert',
            'message' => $this->alertData['message'] ?? '',
            'type' => $this->alertData['type'] ?? 'info',
            'source_type' => $this->alertData['source_type'] ?? null,
            'source_id' => $this->alertData['source_id'] ?? null,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'data' => $this->toArray($notifiable)
        ]);
    }
}
