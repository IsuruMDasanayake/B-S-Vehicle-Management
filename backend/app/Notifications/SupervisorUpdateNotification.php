<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SupervisorUpdateNotification extends Notification
{
    use Queueable;

    public $title;
    public $message;
    public $siteId;
    public $projectId;
    public $type;
    public $updateType; // e.g., 'daily_update', 'batch'
    public $resourceId;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($title, $message, $siteId, $projectId, $type = 'info', $updateType = 'general', $resourceId = null)
    {
        $this->title = $title;
        $this->message = $message;
        $this->siteId = $siteId;
        $this->projectId = $projectId;
        $this->type = $type;
        $this->updateType = $updateType;
        $this->resourceId = $resourceId;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toDatabase($notifiable)
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'site_id' => $this->siteId,
            'project_id' => $this->projectId,
            'type' => $this->type,
            'update_type' => $this->updateType,
            'resource_id' => $this->resourceId,
        ];
    }
}
