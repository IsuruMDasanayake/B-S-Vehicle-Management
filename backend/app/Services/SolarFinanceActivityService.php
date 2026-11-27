<?php

namespace App\Services;

use Spatie\Activitylog\Models\Activity;
use Illuminate\Support\Facades\Auth;

class SolarFinanceActivityService
{
    /**
     * Log a Solar Finance action with rich context.
     */
    public static function log(
        string $event,
        string $description,
        $subject = null,
        array $properties = []
    ) {
        try {
            $user = Auth::user();
            $activity = activity('solar_finance')
                ->event($event)
                ->withProperty('ip_address', request() ? request()->ip() : '127.0.0.1')
                ->withProperty('user_agent', request() ? substr(request()->userAgent() ?? 'System', 0, 150) : 'System');

            if ($user) {
                $activity->causedBy($user)
                    ->withProperty('user_name', $user->name)
                    ->withProperty('user_email', $user->email)
                    ->withProperty('finance_role', $user->solarFinanceRole ? $user->solarFinanceRole->finance_role : $user->role);
            }

            foreach ($properties as $k => $v) {
                $activity->withProperty($k, $v);
            }

            if ($subject) {
                $activity->performedOn($subject);
            }

            return $activity->log($description);
        } catch (\Throwable $e) {
            // Silently log error without interrupting transaction
            \Illuminate\Support\Facades\Log::warning('SolarFinanceActivityService log error: ' . $e->getMessage());
            return null;
        }
    }
}
