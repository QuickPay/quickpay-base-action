require "yaml"
require "test/helper"

describe "Envorimental Variable loaded" do
    it "is loaded" do
        _(ENV["SETTINGS"]).wont_be_nil
    end

    it "has correct values" do
        _(YAML.load(ENV["SETTINGS"])["default"][:service_discovery][:reader]).must_equal "tcp://33.33.33.80:22122"
    end
end