<?php

namespace Tests\Feature;

use Database\Seeders\ErpSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class ErpTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ErpSeeder::class);
    }

    /** Log in as a seeded demo user and return auth headers. */
    protected function auth(string $role = 'admin'): array
    {
        $email = match ($role) {
            'admin' => 'admin@erp.test',
            'manager' => 'manager@erp.test',
            default => 'staff@erp.test',
        };

        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'password',
        ]);

        $response->assertOk();
        $token = $response->json('token');
        $this->assertNotEmpty($token);

        // The auth guard caches the resolved user between requests made
        // inside a single test — forget it so the next request resolves
        // the user from this token instead of reusing the previous one.
        $this->app['auth']->forgetGuards();

        return ['Authorization' => "Bearer {$token}", 'Accept' => 'application/json'];
    }

    protected function admin(): array { return $this->auth('admin'); }
    protected function manager(): array { return $this->auth('manager'); }
    protected function staff(): array { return $this->auth('staff'); }
}
