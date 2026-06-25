<?php
$users = App\Models\User::role(['super_admin', 'fleet_manager'])->get();
Illuminate\Support\Facades\Notification::send($users, new App\Notifications\SystemAlertNotification([
    'title' => 'Low Fuel Alert',
    'message' => 'Vehicle WP KB-1234 is running critically low on fuel.',
    'type' => 'danger',
    'source_type' => 'vehicle',
    'source_id' => 1
]));
Illuminate\Support\Facades\Notification::send($users, new App\Notifications\SystemAlertNotification([
    'title' => 'Insurance Expiry Warning',
    'message' => 'Insurance for vehicle WP KB-1234 will expire in 14 days.',
    'type' => 'warning',
    'source_type' => 'insurance',
    'source_id' => 1
]));
echo "Mock alerts generated.\n";
