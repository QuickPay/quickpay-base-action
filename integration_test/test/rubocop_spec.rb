require "yaml"
require "test/helper"

describe "Rubocop" do
    it "exists" do
        _(File.file?("../.rubocop.yml")).must_equal true
    end
end