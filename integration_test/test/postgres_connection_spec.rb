require "test/helper"

describe "Postgres Connection" do
    it "is reachable" do
        result = `psql -d postgresql://backends_u:abc@localhost/backends_test -c "select 'test';"`.strip
        _(result).must_match /\?column\?/
        _(result).must_match /test/
    end

    it "has pgcrypto installed" do
        _(`psql -S -d postgresql://backends_u:abc@localhost/backends_test -c "select gen_random_uuid();"`).must_match /gen_random_uuid/
    end

    it "has generate_ulid installed" do
        _(`psql -S -d postgresql://backends_u:abc@localhost/backends_test -c "select generate_ulid();"`).must_match /generate_ulid/
    end
end