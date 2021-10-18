require "test/helper"

describe "Postgres Connection" do
    it "is reachable" do
        _(`psql -d postgresql://backends_u:abc@localhost/backends_test -c "select 'test';"`.strip).must_equal "test"
    end

    it "has pgcrypto installed" do
        _(`psql -S -d postgresql://backends_u:abc@localhost/backends_test -c "select gen_random_uuid();"`).must_match /gen_random_uuid/
    end
end