from middleware.security import LoginLockout


def test_login_lockout_blocks_after_max_attempts():
    lockout = LoginLockout(max_attempts=3, lockout_seconds=60)

    for _ in range(3):
        lockout.record_failure("user@test.com")

    assert lockout.is_locked("user@test.com") is True
    assert lockout.seconds_remaining("user@test.com") > 0


def test_login_lockout_clears_on_success():
    lockout = LoginLockout(max_attempts=3, lockout_seconds=60)
    lockout.record_failure("user@test.com")
    lockout.record_failure("user@test.com")
    lockout.record_success("user@test.com")

    assert lockout.is_locked("user@test.com") is False
