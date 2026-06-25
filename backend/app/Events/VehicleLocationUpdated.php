<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $gpsData;

    public function __construct(array $gpsData)
    {
        $this->gpsData = $gpsData;
    }

    public function broadcastOn()
    {
        return new Channel('gps-updates');
    }

    public function broadcastAs()
    {
        return 'location.updated';
    }
}
