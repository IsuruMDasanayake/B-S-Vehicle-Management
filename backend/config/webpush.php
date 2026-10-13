<?php

return [
    'vapid' => [
        'subject' => env('VAPID_SUBJECT', 'mailto:admin@circleengineering.lk'),
        'public_key' => env('VAPID_PUBLIC_KEY', 'BLcezsKcRcAe90JXYgAmrLGCU1gAr2GVFVt2pHAAE-i4mA5xnPGDnQfyXo7UA93ScDbnS2dgwXmzhb0iuaqhE1I'),
        'private_key' => env('VAPID_PRIVATE_KEY', 'LrGjaizZNsnn9NzXAJsNJJJOd5TYTcccs3KJboZV_A4'),
    ],
];
